import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { WorkspaceRole } from '@manatask/shared';

export interface RequestUser {
  id: string;
  email: string;
  /** Session id (from the access token) — used for per-device logout. */
  sid?: string;
}

/** Injects the authenticated user (set by JwtAuthGuard). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser => {
    const req = ctx.switchToHttp().getRequest();
    return req.user;
  },
);

/** Injects the resolved workspace id (set by WorkspaceGuard). */
export const WorkspaceId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest();
    return req.workspaceId;
  },
);

/** Injects the caller's role within the current workspace. */
export const CurrentRole = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): WorkspaceRole => {
    const req = ctx.switchToHttp().getRequest();
    return req.membership?.role;
  },
);

export const ROLES_KEY = 'required_role';
/** Minimum role required to access the route. Use with RolesGuard. */
export const MinRole = (role: WorkspaceRole) => SetMetadata(ROLES_KEY, role);

export const IS_PUBLIC_KEY = 'is_public';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
