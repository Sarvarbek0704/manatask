import { BadRequestException, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { WorkspaceMember } from '../../database/entities';
import { WorkspaceGuard } from './workspace.guard';

function context(req: any): ExecutionContext {
  return { switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext;
}

describe('WorkspaceGuard (tenant isolation)', () => {
  let members: jest.Mocked<Pick<Repository<WorkspaceMember>, 'findOne'>>;
  let guard: WorkspaceGuard;

  beforeEach(() => {
    members = { findOne: jest.fn() } as any;
    // requireEmailVerification = false so verification gating is inactive in these tests.
    const config = { get: jest.fn().mockReturnValue(false) } as any;
    guard = new WorkspaceGuard(members as unknown as Repository<WorkspaceMember>, config);
  });

  it('rejects when no workspace header is provided', async () => {
    const req = { headers: {}, user: { id: 'u1' } };
    await expect(guard.canActivate(context(req))).rejects.toThrow(BadRequestException);
  });

  it('rejects when not authenticated', async () => {
    const req = { headers: { 'x-workspace-id': 'w1' } };
    await expect(guard.canActivate(context(req))).rejects.toThrow(ForbiddenException);
  });

  it('rejects when the user is NOT a member of the workspace', async () => {
    members.findOne.mockResolvedValue(null);
    const req = { headers: { 'x-workspace-id': 'w1' }, user: { id: 'u1' } };
    await expect(guard.canActivate(context(req))).rejects.toThrow(ForbiddenException);
    // Verifies the membership lookup is scoped to BOTH workspace and user.
    expect(members.findOne).toHaveBeenCalledWith({ where: { workspaceId: 'w1', userId: 'u1' } });
  });

  it('attaches workspaceId + membership when the user is a member', async () => {
    const membership = { id: 'm1', workspaceId: 'w1', userId: 'u1', role: 'admin' } as any;
    members.findOne.mockResolvedValue(membership);
    const req: any = { headers: { 'x-workspace-id': 'w1' }, user: { id: 'u1' } };
    await expect(guard.canActivate(context(req))).resolves.toBe(true);
    expect(req.workspaceId).toBe('w1');
    expect(req.membership).toBe(membership);
  });
});
