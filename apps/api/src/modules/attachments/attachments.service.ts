import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { RT_EVENTS } from '@manatask/shared';
import { Attachment, Task } from '../../database/entities';
import { StorageService } from '../storage/storage.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

interface UploadedFile {
  originalname: string;
  buffer: Buffer;
  size: number;
  mimetype: string;
}

@Injectable()
export class AttachmentsService {
  constructor(
    @InjectRepository(Attachment) private attachments: Repository<Attachment>,
    @InjectRepository(Task) private tasks: Repository<Task>,
    private storage: StorageService,
    private jwt: JwtService,
    private config: ConfigService,
    private realtime: RealtimeGateway,
  ) {}

  private async getTask(workspaceId: string, taskId: string): Promise<Task> {
    const task = await this.tasks.findOne({ where: { id: taskId, workspaceId } });
    if (!task) throw new NotFoundException('Task not found.');
    return task;
  }

  async upload(workspaceId: string, userId: string, taskId: string, file: UploadedFile) {
    if (!file) throw new BadRequestException('No file uploaded.');
    const maxMb = this.config.get<number>('maxUploadMb') ?? 25;
    if (file.size > maxMb * 1024 * 1024) {
      throw new BadRequestException(`File exceeds ${maxMb}MB limit.`);
    }
    await this.getTask(workspaceId, taskId);

    const safeName = file.originalname.replace(/[^\w.\-]+/g, '_').slice(0, 120);
    const key = `${workspaceId}/${taskId}/${randomUUID()}-${safeName}`;
    await this.storage.put(key, file.buffer, file.mimetype);

    const saved = await this.attachments.save(
      this.attachments.create({
        taskId,
        filename: file.originalname,
        storageKey: key,
        size: file.size,
        mimeType: file.mimetype,
        uploadedById: userId,
      }),
    );
    this.realtime.emitToWorkspace(workspaceId, RT_EVENTS.TASK_UPDATED, { id: taskId });
    return this.toDto(saved);
  }

  async list(workspaceId: string, taskId: string) {
    await this.getTask(workspaceId, taskId);
    const items = await this.attachments.find({ where: { taskId }, order: { createdAt: 'DESC' } });
    return items.map((a) => this.toDto(a));
  }

  async remove(workspaceId: string, taskId: string, id: string) {
    await this.getTask(workspaceId, taskId);
    const att = await this.attachments.findOne({ where: { id, taskId } });
    if (!att) throw new NotFoundException('Attachment not found.');
    await this.storage.delete(att.storageKey);
    await this.attachments.remove(att);
    this.realtime.emitToWorkspace(workspaceId, RT_EVENTS.TASK_UPDATED, { id: taskId });
    return { ok: true };
  }

  /** Resolves a download: returns either a redirect URL (S3) or a stream key (local). */
  async resolveDownload(id: string, token: string) {
    let payload: { aid: string };
    try {
      payload = await this.jwt.verifyAsync(token, {
        secret: this.config.get<string>('jwt.accessSecret'),
      });
    } catch {
      throw new ForbiddenException('Invalid or expired download link.');
    }
    if (payload.aid !== id) throw new ForbiddenException('Token does not match resource.');

    const att = await this.attachments.findOne({ where: { id } });
    if (!att) throw new NotFoundException('Attachment not found.');

    if (this.storage.usingS3) {
      return {
        kind: 'redirect' as const,
        redirectUrl: await this.storage.presignedGet(att.storageKey, att.filename),
        attachment: att,
      };
    }
    return { kind: 'stream' as const, stream: this.storage.streamLocal(att.storageKey), attachment: att };
  }

  private toDto(a: Attachment) {
    const token = this.jwt.sign(
      { aid: a.id },
      { secret: this.config.get<string>('jwt.accessSecret'), expiresIn: '1h' },
    );
    const apiUrl = this.config.get<string>('apiUrl');
    return {
      id: a.id,
      filename: a.filename,
      url: `${apiUrl}/attachments/${a.id}?t=${token}`,
      size: Number(a.size),
      mimeType: a.mimeType,
      createdAt: new Date(a.createdAt).toISOString(),
    };
  }
}
