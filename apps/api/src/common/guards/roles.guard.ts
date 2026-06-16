import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WorkspaceRole, ROLE_RANK } from '@manatask/shared';
import { ROLES_KEY } from '../decorators';

/** Enforces a minimum workspace role. Runs after WorkspaceGuard. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<WorkspaceRole>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const req = context.switchToHttp().getRequest();
    const role: WorkspaceRole | undefined = req.membership?.role;
    if (!role || ROLE_RANK[role] < ROLE_RANK[required]) {
      throw new ForbiddenException(`Requires at least '${required}' role.`);
    }
    return true;
  }
}
