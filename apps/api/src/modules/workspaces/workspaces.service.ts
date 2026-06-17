import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, MoreThan } from 'typeorm';
import { customAlphabet } from 'nanoid';
import {
  WorkspaceRole,
  ROLE_RANK,
  InvitationStatus,
  NotificationType,
} from '@manatask/shared';
import {
  Workspace,
  WorkspaceMember,
  Invitation,
  User,
} from '../../database/entities';
import { toWorkspace, toMember } from '../../common/mappers';
import { slugify } from '../../common/util';
import { EmailQueueService } from '../jobs/email-queue.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateWorkspaceBody, InviteBody } from './dto';

const tokenGen = customAlphabet(
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789',
  32,
);

@Injectable()
export class WorkspacesService {
  constructor(
    @InjectRepository(Workspace) private workspaces: Repository<Workspace>,
    @InjectRepository(WorkspaceMember) private members: Repository<WorkspaceMember>,
    @InjectRepository(Invitation) private invitations: Repository<Invitation>,
    @InjectRepository(User) private users: Repository<User>,
    private dataSource: DataSource,
    private email: EmailQueueService,
    private notifications: NotificationsService,
  ) {}

  /** Workspaces the user belongs to. */
  async listMine(userId: string) {
    const memberships = await this.members.find({
      where: { userId },
      relations: { workspace: true },
    });
    return memberships.map((m) => ({
      ...toWorkspace(m.workspace),
      role: m.role,
    }));
  }

  async create(userId: string, body: CreateWorkspaceBody) {
    const base = slugify(body.slug || body.name);
    const slug = await this.uniqueSlug(base);
    const ws = await this.dataSource.transaction(async (mgr) => {
      const saved = await mgr
        .getRepository(Workspace)
        .save(mgr.getRepository(Workspace).create({ name: body.name, slug }));
      await mgr.getRepository(WorkspaceMember).save(
        mgr.getRepository(WorkspaceMember).create({
          workspaceId: saved.id,
          userId,
          role: WorkspaceRole.OWNER,
        }),
      );
      return saved;
    });
    return toWorkspace(ws);
  }

  async getOne(workspaceId: string) {
    const ws = await this.workspaces.findOne({ where: { id: workspaceId } });
    if (!ws) throw new NotFoundException('Workspace not found.');
    return toWorkspace(ws);
  }

  async update(workspaceId: string, body: { name?: string; logoUrl?: string }) {
    const ws = await this.workspaces.findOne({ where: { id: workspaceId } });
    if (!ws) throw new NotFoundException('Workspace not found.');
    if (body.name !== undefined) ws.name = body.name.trim();
    if (body.logoUrl !== undefined) ws.logoUrl = body.logoUrl.trim() || null;
    await this.workspaces.save(ws);
    return toWorkspace(ws);
  }

  async listMembers(workspaceId: string) {
    const members = await this.members.find({
      where: { workspaceId },
      order: { createdAt: 'ASC' },
    });
    return members.map(toMember);
  }

  async invite(workspaceId: string, inviterId: string, inviterRole: WorkspaceRole, body: InviteBody) {
    // Cannot grant a role higher than your own.
    if (ROLE_RANK[body.role] > ROLE_RANK[inviterRole]) {
      throw new ForbiddenException('Cannot invite someone with a higher role than yours.');
    }
    const email = body.email.toLowerCase().trim();

    const existingMember = await this.members
      .createQueryBuilder('m')
      .innerJoin('m.user', 'u')
      .where('m.workspaceId = :workspaceId', { workspaceId })
      .andWhere('u.email = :email', { email })
      .getCount();
    if (existingMember > 0) {
      throw new ConflictException('User is already a member.');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await this.invitations.save(
      this.invitations.create({
        workspaceId,
        email,
        role: body.role,
        token: tokenGen(),
        status: InvitationStatus.PENDING,
        invitedById: inviterId,
        expiresAt,
      }),
    );

    const ws = await this.workspaces.findOneByOrFail({ id: workspaceId });
    const link = `${process.env.WEB_ORIGIN ?? 'http://localhost:3000'}/invite/${invitation.token}`;
    await this.email.add({
      to: email,
      subject: `You're invited to ${ws.name} on manaTask`,
      html: `<p>You have been invited to join <b>${ws.name}</b>.</p>
             <p><a href="${link}">Accept the invitation</a></p>`,
    });

    // If the invitee already has an account, also notify them in-app.
    const existingUser = await this.users.findOne({ where: { email } });
    if (existingUser) {
      await this.notifications.create(existingUser.id, {
        workspaceId,
        type: NotificationType.INVITED,
        title: `Invited to ${ws.name}`,
        body: `You were invited as ${body.role}.`,
        data: { token: invitation.token, workspaceId },
      });
    }

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      token: invitation.token,
      link,
      expiresAt: invitation.expiresAt.toISOString(),
      createdAt: invitation.createdAt.toISOString(),
    };
  }

  async listInvitations(workspaceId: string) {
    const invs = await this.invitations.find({
      where: { workspaceId, status: InvitationStatus.PENDING },
      order: { createdAt: 'DESC' },
    });
    return invs.map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      status: i.status,
      expiresAt: i.expiresAt.toISOString(),
      createdAt: i.createdAt.toISOString(),
    }));
  }

  async revokeInvitation(workspaceId: string, invitationId: string) {
    await this.invitations.update(
      { id: invitationId, workspaceId },
      { status: InvitationStatus.REVOKED },
    );
    return { ok: true };
  }

  /** Accept an invitation by token — joins the authenticated user. */
  async acceptInvitation(token: string, userId: string) {
    const inv = await this.invitations.findOne({
      where: { token, status: InvitationStatus.PENDING, expiresAt: MoreThan(new Date()) },
    });
    if (!inv) throw new BadRequestException('Invitation invalid or expired.');

    const user = await this.users.findOneByOrFail({ id: userId });
    if (user.email.toLowerCase() !== inv.email.toLowerCase()) {
      throw new ForbiddenException('This invitation was sent to a different email.');
    }

    const already = await this.members.findOne({
      where: { workspaceId: inv.workspaceId, userId },
    });
    if (!already) {
      await this.members.save(
        this.members.create({
          workspaceId: inv.workspaceId,
          userId,
          role: inv.role,
        }),
      );
    }
    inv.status = InvitationStatus.ACCEPTED;
    await this.invitations.save(inv);
    return this.getOne(inv.workspaceId);
  }

  async updateMemberRole(
    workspaceId: string,
    actorRole: WorkspaceRole,
    memberId: string,
    role: WorkspaceRole,
  ) {
    const member = await this.members.findOne({ where: { id: memberId, workspaceId } });
    if (!member) throw new NotFoundException('Member not found.');
    if (member.role === WorkspaceRole.OWNER) {
      throw new ForbiddenException('Cannot change the owner role here.');
    }
    if (ROLE_RANK[role] > ROLE_RANK[actorRole]) {
      throw new ForbiddenException('Cannot assign a role higher than your own.');
    }
    member.role = role;
    await this.members.save(member);
    return toMember(member);
  }

  async removeMember(workspaceId: string, memberId: string) {
    const member = await this.members.findOne({ where: { id: memberId, workspaceId } });
    if (!member) throw new NotFoundException('Member not found.');
    if (member.role === WorkspaceRole.OWNER) {
      throw new ForbiddenException('Cannot remove the workspace owner.');
    }
    await this.members.remove(member);
    return { ok: true };
  }

  private async uniqueSlug(base: string): Promise<string> {
    let slug = base || 'workspace';
    let i = 1;
    while (await this.workspaces.findOne({ where: { slug } })) {
      slug = `${base}-${i++}`;
    }
    return slug;
  }
}
