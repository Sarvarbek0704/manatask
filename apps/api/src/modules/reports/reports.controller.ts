import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { WorkspaceId } from '../../common/decorators';
import { WorkspaceGuard } from '../../common/guards/workspace.guard';

@Controller('reports')
@UseGuards(WorkspaceGuard)
export class ReportsController {
  constructor(private service: ReportsService) {}

  @Get('dashboard')
  dashboard(@WorkspaceId() ws: string, @Query('projectId') projectId?: string) {
    return this.service.dashboard(ws, projectId);
  }

  @Get('time')
  time(
    @WorkspaceId() ws: string,
    @Query('projectId') projectId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.timeReport(ws, { projectId, from, to });
  }

  @Get('burndown')
  burndown(@WorkspaceId() ws: string, @Query('sprintId') sprintId: string) {
    return this.service.burndown(ws, sprintId);
  }

  @Get('velocity')
  velocity(@WorkspaceId() ws: string, @Query('projectId') projectId: string) {
    return this.service.velocity(ws, projectId);
  }

  @Get('analytics')
  analytics(
    @WorkspaceId() ws: string,
    @Query('projectId') projectId?: string,
    @Query('days') days?: string,
  ) {
    return this.service.analytics(ws, { projectId, days: days ? parseInt(days, 10) : undefined });
  }
}
