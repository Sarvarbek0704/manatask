import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { WorkspaceRole } from '@manatask/shared';
import { ActivityService } from './activity.service';
import { WorkspaceId, MinRole } from '../../common/decorators';
import { WorkspaceGuard } from '../../common/guards/workspace.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

// Audit feed — management only.
@Controller('activity')
@UseGuards(WorkspaceGuard, RolesGuard)
@MinRole(WorkspaceRole.ADMIN)
export class ActivityController {
  constructor(private service: ActivityService) {}

  @Get()
  list(@WorkspaceId() ws: string, @Query('page') page?: string) {
    return this.service.forWorkspace(ws, page ? parseInt(page, 10) : 1);
  }
}
