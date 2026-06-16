import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WorkspaceRole } from '@manatask/shared';
import { ProjectsService } from './projects.service';
import { SprintsService } from './sprints.service';
import { LabelsService } from './labels.service';
import {
  CreateProjectBody,
  UpdateProjectBody,
  CreateStatusBody,
  UpdateStatusBody,
  CreateSprintBody,
  UpdateSprintBody,
  CreateLabelBody,
} from './dto';
import { WorkspaceId, MinRole } from '../../common/decorators';
import { WorkspaceGuard } from '../../common/guards/workspace.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller()
@UseGuards(WorkspaceGuard)
export class ProjectsController {
  constructor(
    private projects: ProjectsService,
    private sprints: SprintsService,
    private labels: LabelsService,
  ) {}

  // ---- Projects ----
  @Get('projects')
  list(@WorkspaceId() ws: string, @Query('archived') archived?: string) {
    return this.projects.list(ws, archived === 'true');
  }

  @Post('projects')
  @UseGuards(RolesGuard)
  @MinRole(WorkspaceRole.MEMBER)
  create(@WorkspaceId() ws: string, @Body() body: CreateProjectBody) {
    return this.projects.create(ws, body);
  }

  @Get('projects/:id')
  getOne(@WorkspaceId() ws: string, @Param('id') id: string) {
    return this.projects.getOne(ws, id);
  }

  @Patch('projects/:id')
  @UseGuards(RolesGuard)
  @MinRole(WorkspaceRole.MEMBER)
  update(@WorkspaceId() ws: string, @Param('id') id: string, @Body() body: UpdateProjectBody) {
    return this.projects.update(ws, id, body);
  }

  @Post('projects/:id/archive')
  @UseGuards(RolesGuard)
  @MinRole(WorkspaceRole.ADMIN)
  archive(@WorkspaceId() ws: string, @Param('id') id: string) {
    return this.projects.setArchived(ws, id, true);
  }

  @Post('projects/:id/unarchive')
  @UseGuards(RolesGuard)
  @MinRole(WorkspaceRole.ADMIN)
  unarchive(@WorkspaceId() ws: string, @Param('id') id: string) {
    return this.projects.setArchived(ws, id, false);
  }

  // ---- Statuses ----
  @Post('projects/:id/statuses')
  @UseGuards(RolesGuard)
  @MinRole(WorkspaceRole.MEMBER)
  addStatus(@WorkspaceId() ws: string, @Param('id') id: string, @Body() body: CreateStatusBody) {
    return this.projects.addStatus(ws, id, body);
  }

  @Patch('projects/:id/statuses/:statusId')
  @UseGuards(RolesGuard)
  @MinRole(WorkspaceRole.MEMBER)
  updateStatus(
    @WorkspaceId() ws: string,
    @Param('id') id: string,
    @Param('statusId') statusId: string,
    @Body() body: UpdateStatusBody,
  ) {
    return this.projects.updateStatus(ws, id, statusId, body);
  }

  @Delete('projects/:id/statuses/:statusId')
  @UseGuards(RolesGuard)
  @MinRole(WorkspaceRole.MEMBER)
  deleteStatus(@WorkspaceId() ws: string, @Param('id') id: string, @Param('statusId') statusId: string) {
    return this.projects.deleteStatus(ws, id, statusId);
  }

  // ---- Sprints ----
  @Get('projects/:id/sprints')
  listSprints(@WorkspaceId() ws: string, @Param('id') id: string) {
    return this.sprints.list(ws, id);
  }

  @Post('projects/:id/sprints')
  @UseGuards(RolesGuard)
  @MinRole(WorkspaceRole.MEMBER)
  createSprint(@WorkspaceId() ws: string, @Param('id') id: string, @Body() body: CreateSprintBody) {
    return this.sprints.create(ws, id, body);
  }

  @Patch('projects/:id/sprints/:sprintId')
  @UseGuards(RolesGuard)
  @MinRole(WorkspaceRole.MEMBER)
  updateSprint(
    @WorkspaceId() ws: string,
    @Param('id') id: string,
    @Param('sprintId') sprintId: string,
    @Body() body: UpdateSprintBody,
  ) {
    return this.sprints.update(ws, id, sprintId, body);
  }

  @Delete('projects/:id/sprints/:sprintId')
  @UseGuards(RolesGuard)
  @MinRole(WorkspaceRole.MEMBER)
  deleteSprint(@WorkspaceId() ws: string, @Param('id') id: string, @Param('sprintId') sprintId: string) {
    return this.sprints.remove(ws, id, sprintId);
  }

  // ---- Labels (workspace-scoped) ----
  @Get('labels')
  listLabels(@WorkspaceId() ws: string) {
    return this.labels.list(ws);
  }

  @Post('labels')
  @UseGuards(RolesGuard)
  @MinRole(WorkspaceRole.MEMBER)
  createLabel(@WorkspaceId() ws: string, @Body() body: CreateLabelBody) {
    return this.labels.create(ws, body);
  }

  @Delete('labels/:id')
  @UseGuards(RolesGuard)
  @MinRole(WorkspaceRole.MEMBER)
  deleteLabel(@WorkspaceId() ws: string, @Param('id') id: string) {
    return this.labels.remove(ws, id);
  }
}
