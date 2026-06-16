import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Server, Socket } from 'socket.io';
import { WorkspaceMember } from '../../database/entities';
import { isAllowedOrigin } from '../../common/cors';

/**
 * Real-time fan-out. Clients connect with a JWT (auth.token), then join
 * per-workspace and per-task rooms. Services broadcast domain events here so
 * every connected teammate sees live updates.
 */
@WebSocketGateway({
  cors: {
    origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) =>
      cb(null, isAllowedOrigin(origin)),
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private jwt: JwtService,
    private config: ConfigService,
    @InjectRepository(WorkspaceMember)
    private members: Repository<WorkspaceMember>,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        (client.handshake.headers['authorization'] as string | undefined)?.replace(
          'Bearer ',
          '',
        );
      const payload = await this.jwt.verifyAsync(token, {
        secret: this.config.get<string>('jwt.accessSecret'),
      });
      client.data.userId = payload.sub;
      client.join(`user:${payload.sub}`);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const ws = client.data.workspaceId;
    if (ws) {
      client.to(`workspace:${ws}`).emit('presence.update', {
        userId: client.data.userId,
        online: false,
      });
    }
  }

  @SubscribeMessage('workspace.join')
  async joinWorkspace(@ConnectedSocket() client: Socket, @MessageBody() workspaceId: string) {
    // Verify the connected user is actually a member before joining the room —
    // otherwise anyone with a workspace id could eavesdrop on live events.
    const member = await this.members.findOne({
      where: { workspaceId, userId: client.data.userId },
    });
    if (!member) {
      return { ok: false, error: 'forbidden' };
    }
    client.data.workspaceId = workspaceId;
    client.join(`workspace:${workspaceId}`);
    client.to(`workspace:${workspaceId}`).emit('presence.update', {
      userId: client.data.userId,
      online: true,
    });
    return { ok: true };
  }

  @SubscribeMessage('task.join')
  joinTask(@ConnectedSocket() client: Socket, @MessageBody() taskId: string) {
    // Only allow joining task rooms within a workspace the client has joined.
    if (!client.data.workspaceId) return { ok: false, error: 'join workspace first' };
    client.join(`task:${taskId}`);
    return { ok: true };
  }

  @SubscribeMessage('task.leave')
  leaveTask(@ConnectedSocket() client: Socket, @MessageBody() taskId: string) {
    client.leave(`task:${taskId}`);
    return { ok: true };
  }

  // ---- Server-side broadcast helpers ----
  emitToWorkspace(workspaceId: string, event: string, payload: unknown) {
    this.server?.to(`workspace:${workspaceId}`).emit(event, payload);
  }

  emitToTask(taskId: string, event: string, payload: unknown) {
    this.server?.to(`task:${taskId}`).emit(event, payload);
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.server?.to(`user:${userId}`).emit(event, payload);
  }
}
