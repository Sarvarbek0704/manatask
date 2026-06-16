import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { WorkspaceRole } from '@manatask/shared';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceBody, InviteBody, UpdateMemberRoleBody } from './dto';
import {
  CurrentUser,
  RequestUser,
  WorkspaceId,
  CurrentRole,
  MinRole,
} from '../../common/decorators';
import { WorkspaceGuard } from '../../common/guards/workspace.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('workspaces')
export class WorkspacesController {
  constructor(private service: WorkspacesService) {}

  // ---- Workspace-agnostic (JWT only) ----
  @Get()
  listMine(@CurrentUser() user: RequestUser) {
    return this.service.listMine(user.id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() body: CreateWorkspaceBody) {
    return this.service.create(user.id, body);
  }

  @Post('invitations/:token/accept')
  accept(@Param('token') token: string, @CurrentUser() user: RequestUser) {
    return this.service.acceptInvitation(token, user.id);
  }

  // ---- Workspace-scoped (requires x-workspace-id + membership) ----
  @Get('current')
  @UseGuards(WorkspaceGuard)
  current(@WorkspaceId() workspaceId: string) {
    return this.service.getOne(workspaceId);
  }

  @Get('current/members')
  @UseGuards(WorkspaceGuard)
  members(@WorkspaceId() workspaceId: string) {
    return this.service.listMembers(workspaceId);
  }

  @Post('current/invitations')
  @UseGuards(WorkspaceGuard, RolesGuard)
  @MinRole(WorkspaceRole.ADMIN)
  invite(
    @WorkspaceId() workspaceId: string,
    @CurrentUser() user: RequestUser,
    @CurrentRole() role: WorkspaceRole,
    @Body() body: InviteBody,
  ) {
    return this.service.invite(workspaceId, user.id, role, body);
  }

  @Get('current/invitations')
  @UseGuards(WorkspaceGuard, RolesGuard)
  @MinRole(WorkspaceRole.ADMIN)
  invitations(@WorkspaceId() workspaceId: string) {
    return this.service.listInvitations(workspaceId);
  }

  @Delete('current/invitations/:id')
  @UseGuards(WorkspaceGuard, RolesGuard)
  @MinRole(WorkspaceRole.ADMIN)
  revoke(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.service.revokeInvitation(workspaceId, id);
  }

  @Patch('current/members/:id')
  @UseGuards(WorkspaceGuard, RolesGuard)
  @MinRole(WorkspaceRole.ADMIN)
  updateRole(
    @WorkspaceId() workspaceId: string,
    @CurrentRole() role: WorkspaceRole,
    @Param('id') id: string,
    @Body() body: UpdateMemberRoleBody,
  ) {
    return this.service.updateMemberRole(workspaceId, role, id, body.role);
  }

  @Delete('current/members/:id')
  @UseGuards(WorkspaceGuard, RolesGuard)
  @MinRole(WorkspaceRole.ADMIN)
  removeMember(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.service.removeMember(workspaceId, id);
  }
}
