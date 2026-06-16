import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WorkspaceRole } from '@manatask/shared';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators';

function ctxWithRole(role?: WorkspaceRole): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ membership: role ? { role } : undefined }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const make = (required?: WorkspaceRole) => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(required),
    } as unknown as Reflector;
    return new RolesGuard(reflector);
  };

  it('allows when no role requirement is set', () => {
    expect(make(undefined).canActivate(ctxWithRole())).toBe(true);
  });

  it('allows when caller role outranks the requirement', () => {
    const guard = make(WorkspaceRole.MEMBER);
    expect(guard.canActivate(ctxWithRole(WorkspaceRole.ADMIN))).toBe(true);
    expect(guard.canActivate(ctxWithRole(WorkspaceRole.OWNER))).toBe(true);
  });

  it('allows when role exactly meets the requirement', () => {
    expect(make(WorkspaceRole.ADMIN).canActivate(ctxWithRole(WorkspaceRole.ADMIN))).toBe(true);
  });

  it('rejects when caller role is too low', () => {
    expect(() => make(WorkspaceRole.ADMIN).canActivate(ctxWithRole(WorkspaceRole.MEMBER))).toThrow(
      ForbiddenException,
    );
    expect(() => make(WorkspaceRole.MEMBER).canActivate(ctxWithRole(WorkspaceRole.GUEST))).toThrow(
      ForbiddenException,
    );
  });

  it('rejects when there is no membership at all', () => {
    expect(() => make(WorkspaceRole.GUEST).canActivate(ctxWithRole(undefined))).toThrow(
      ForbiddenException,
    );
  });

  // Guards against the ROLES_KEY contract changing silently.
  it('reads metadata using ROLES_KEY', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) } as unknown as Reflector;
    new RolesGuard(reflector).canActivate(ctxWithRole());
    expect((reflector.getAllAndOverride as jest.Mock).mock.calls[0][0]).toBe(ROLES_KEY);
  });
});
