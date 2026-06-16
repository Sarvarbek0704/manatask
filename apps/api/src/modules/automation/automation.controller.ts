import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { WorkspaceRole } from '@manatask/shared';
import { AutomationService } from './automation.service';
import { WorkspaceId, MinRole } from '../../common/decorators';
import { WorkspaceGuard } from '../../common/guards/workspace.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('projects/:projectId/automations')
@UseGuards(WorkspaceGuard, RolesGuard)
@MinRole(WorkspaceRole.MEMBER)
export class AutomationController {
  constructor(private service: AutomationService) {}

  @Get()
  list(@WorkspaceId() ws: string, @Param('projectId') projectId: string) {
    return this.service.list(ws, projectId);
  }

  @Post()
  create(@WorkspaceId() ws: string, @Param('projectId') projectId: string, @Body() body: any) {
    return this.service.create(ws, projectId, body);
  }

  @Patch(':id')
  update(@WorkspaceId() ws: string, @Param('id') id: string, @Body() body: any) {
    return this.service.update(ws, id, body);
  }

  @Delete(':id')
  remove(@WorkspaceId() ws: string, @Param('id') id: string) {
    return this.service.remove(ws, id);
  }
}
