import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { WorkspaceRole } from '@manatask/shared';
import { ReportsService } from './reports.service';
import { WorkspaceId, MinRole, CurrentUser, CurrentRole, RequestUser } from '../../common/decorators';
import { WorkspaceGuard } from '../../common/guards/workspace.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

// Team-wide analytics is management-only — workers don't see it. (Dashboard
// stays open since it's the shared landing overview.)
@Controller('reports')
@UseGuards(WorkspaceGuard)
export class ReportsController {
  constructor(private service: ReportsService) {}

  @Get('dashboard')
  dashboard(
    @WorkspaceId() ws: string,
    @CurrentUser() user: RequestUser,
    @CurrentRole() role: WorkspaceRole,
    @Query('projectId') projectId?: string,
  ) {
    // Workers/guests see only their own tasks; admins/owners see the whole workspace.
    const isLeader = role === WorkspaceRole.OWNER || role === WorkspaceRole.ADMIN;
    return this.service.dashboard(ws, projectId, isLeader ? {} : { assigneeId: user.id });
  }

  @Get('time')
  @UseGuards(RolesGuard)
  @MinRole(WorkspaceRole.ADMIN)
  time(
    @WorkspaceId() ws: string,
    @Query('projectId') projectId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.timeReport(ws, { projectId, from, to });
  }

  @Get('burndown')
  @UseGuards(RolesGuard)
  @MinRole(WorkspaceRole.ADMIN)
  burndown(@WorkspaceId() ws: string, @Query('sprintId') sprintId: string) {
    return this.service.burndown(ws, sprintId);
  }

  @Get('velocity')
  @UseGuards(RolesGuard)
  @MinRole(WorkspaceRole.ADMIN)
  velocity(@WorkspaceId() ws: string, @Query('projectId') projectId: string) {
    return this.service.velocity(ws, projectId);
  }

  @Get('analytics')
  @UseGuards(RolesGuard)
  @MinRole(WorkspaceRole.ADMIN)
  analytics(
    @WorkspaceId() ws: string,
    @Query('projectId') projectId?: string,
    @Query('days') days?: string,
  ) {
    return this.service.analytics(ws, { projectId, days: days ? parseInt(days, 10) : undefined });
  }
}
