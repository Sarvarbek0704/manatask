import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { WorkspaceMember } from '../../database/entities';

/**
 * Resolves the active workspace from the `x-workspace-id` header (or `workspaceId`
 * route param / query), verifies the caller is a member, and attaches
 * `req.workspaceId` + `req.membership`. This is the core of tenant isolation:
 * every tenant-scoped service then filters by req.workspaceId.
 */
@Injectable()
export class WorkspaceGuard implements CanActivate {
  constructor(
    @InjectRepository(WorkspaceMember)
    private readonly members: Repository<WorkspaceMember>,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    // API-key requests are bound to their own workspace with a fixed role.
    if (req.apiKeyAuth) {
      req.workspaceId = req.apiKeyAuth.workspaceId;
      req.membership = { role: req.apiKeyAuth.role };
      return true;
    }

    const workspaceId =
      req.headers['x-workspace-id'] ||
      req.params?.workspaceId ||
      req.query?.workspaceId;

    if (!workspaceId) {
      throw new BadRequestException('Missing workspace context (x-workspace-id).');
    }
    if (!req.user?.id) {
      throw new ForbiddenException('Not authenticated.');
    }

    const membership = await this.members.findOne({
      where: { workspaceId, userId: req.user.id },
    });
    if (!membership) {
      throw new ForbiddenException('You are not a member of this workspace.');
    }

    // Gate workspace data behind email verification when enabled. membership.user
    // is eager-loaded, so this needs no extra query.
    if (
      this.config.get<boolean>('requireEmailVerification') &&
      !membership.user?.emailVerified
    ) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Email verification required.',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    req.workspaceId = workspaceId;
    req.membership = membership;
    return true;
  }
}
