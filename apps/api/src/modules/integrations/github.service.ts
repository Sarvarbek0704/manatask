import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { customAlphabet } from 'nanoid';
import { WorkspaceRole, RT_EVENTS } from '@manatask/shared';
import { Workspace, Project, Task, Comment, WorkspaceMember } from '../../database/entities';
import { toComment } from '../../common/mappers';
import { RealtimeGateway } from '../realtime/realtime.gateway';

const secretGen = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz0123456789', 36);
const KEY_RE = /\b([A-Z][A-Z0-9]{1,9})-(\d+)\b/g;

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);

  constructor(
    @InjectRepository(Workspace) private workspaces: Repository<Workspace>,
    @InjectRepository(Project) private projects: Repository<Project>,
    @InjectRepository(Task) private tasks: Repository<Task>,
    @InjectRepository(Comment) private comments: Repository<Comment>,
    @InjectRepository(WorkspaceMember) private members: Repository<WorkspaceMember>,
    private config: ConfigService,
    private realtime: RealtimeGateway,
  ) {}

  private webhookUrl(workspaceId: string) {
    const api = this.config.get<string>('apiUrl') ?? 'http://localhost:4000/api';
    return `${api}/integrations/github/${workspaceId}`;
  }

  private async secretOf(workspaceId: string): Promise<string | null> {
    const row = await this.workspaces
      .createQueryBuilder('w')
      .addSelect('w.githubSecret')
      .where('w.id = :id', { id: workspaceId })
      .getOne();
    return row?.githubSecret ?? null;
  }

  async getConfig(workspaceId: string) {
    const secret = await this.secretOf(workspaceId);
    return { connected: !!secret, secret: secret ?? null, webhookUrl: this.webhookUrl(workspaceId) };
  }

  async connect(workspaceId: string) {
    const secret = `ghs_${secretGen()}`;
    await this.workspaces.update({ id: workspaceId }, { githubSecret: secret });
    return { connected: true, secret, webhookUrl: this.webhookUrl(workspaceId) };
  }

  async disconnect(workspaceId: string) {
    await this.workspaces.update({ id: workspaceId }, { githubSecret: null });
    return { connected: false };
  }

  /** Verify the GitHub HMAC signature against the stored workspace secret. */
  private verify(secret: string, raw: Buffer, signature?: string): boolean {
    if (!signature) return false;
    const digest = 'sha256=' + createHmac('sha256', secret).update(raw).digest('hex');
    const a = Buffer.from(digest);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  /** Handle a push event: link commits to tasks whose KEY-### they mention. */
  async handlePush(workspaceId: string, raw: Buffer, signature: string | undefined, payload: any) {
    const secret = await this.secretOf(workspaceId);
    if (!secret || !this.verify(secret, raw, signature)) {
      return { ok: false, reason: 'invalid signature' };
    }
    const commits: any[] = Array.isArray(payload?.commits) ? payload.commits : [];
    if (!commits.length) return { ok: true, linked: 0 };

    // Owner authors the linking comment (Comment.authorId is required).
    const owner = await this.members.findOne({
      where: { workspaceId, role: WorkspaceRole.OWNER },
    });
    if (!owner) return { ok: true, linked: 0 };

    const repo = payload?.repository?.full_name ?? 'repo';
    let linked = 0;
    for (const commit of commits) {
      const msg: string = commit?.message ?? '';
      const author: string = commit?.author?.name ?? 'someone';
      const sha: string = (commit?.id ?? '').slice(0, 7);
      const url: string = commit?.url ?? '';
      const keys = new Set<string>();
      let m: RegExpExecArray | null;
      KEY_RE.lastIndex = 0;
      while ((m = KEY_RE.exec(msg)) !== null) keys.add(`${m[1]}:${m[2]}`);

      for (const k of keys) {
        const [key, numStr] = k.split(':');
        const project = await this.projects.findOne({ where: { workspaceId, key } });
        if (!project) continue;
        const task = await this.tasks.findOne({ where: { projectId: project.id, number: Number(numStr) } });
        if (!task) continue;
        const body = `**GitHub** · commit [\`${sha}\`](${url}) in ${repo} by ${author}:\n${msg.split('\n')[0]}`;
        const saved = await this.comments.save(this.comments.create({ taskId: task.id, authorId: owner.userId, body }));
        const full = await this.comments.findOneOrFail({ where: { id: saved.id } });
        this.realtime.emitToTask(task.id, RT_EVENTS.COMMENT_CREATED, toComment(full));
        this.realtime.emitToWorkspace(workspaceId, RT_EVENTS.TASK_UPDATED, { id: task.id });
        linked++;
      }
    }
    this.logger.log(`GitHub push linked ${linked} commit reference(s) in workspace ${workspaceId}`);
    return { ok: true, linked };
  }
}
