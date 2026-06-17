import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { WorkspaceRole } from '@manatask/shared';
import { CustomFieldsService } from './custom-fields.service';
import { SavedViewsService } from './saved-views.service';
import { TemplatesService } from './templates.service';
import { RecurringService } from './recurring.service';
import { WorkspaceId, CurrentUser, RequestUser, MinRole } from '../../common/decorators';
import { WorkspaceGuard } from '../../common/guards/workspace.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller()
@UseGuards(WorkspaceGuard)
export class ConfigController {
  constructor(
    private customFields: CustomFieldsService,
    private savedViews: SavedViewsService,
    private templates: TemplatesService,
    private recurring: RecurringService,
  ) {}

  // ---- Custom fields ----
  @Get('projects/:projectId/custom-fields')
  listFields(@Param('projectId') projectId: string) {
    return this.customFields.list(projectId);
  }

  @Post('projects/:projectId/custom-fields')
  @UseGuards(RolesGuard) @MinRole(WorkspaceRole.ADMIN)
  createField(@Param('projectId') projectId: string, @Body() body: any) {
    return this.customFields.create(projectId, body);
  }

  @Patch('projects/:projectId/custom-fields/:id')
  @UseGuards(RolesGuard) @MinRole(WorkspaceRole.ADMIN)
  updateField(@Param('projectId') projectId: string, @Param('id') id: string, @Body() body: any) {
    return this.customFields.update(projectId, id, body);
  }

  @Delete('projects/:projectId/custom-fields/:id')
  @UseGuards(RolesGuard) @MinRole(WorkspaceRole.ADMIN)
  deleteField(@Param('projectId') projectId: string, @Param('id') id: string) {
    return this.customFields.remove(projectId, id);
  }

  // ---- Saved views ----
  @Get('views')
  listViews(@WorkspaceId() ws: string, @CurrentUser() u: RequestUser, @Query('projectId') projectId?: string) {
    return this.savedViews.list(ws, u.id, projectId);
  }

  @Post('views')
  createView(@WorkspaceId() ws: string, @CurrentUser() u: RequestUser, @Body() body: any) {
    return this.savedViews.create(ws, u.id, body);
  }

  @Patch('views/:id')
  updateView(@WorkspaceId() ws: string, @CurrentUser() u: RequestUser, @Param('id') id: string, @Body() body: any) {
    return this.savedViews.update(ws, u.id, id, body);
  }

  @Delete('views/:id')
  deleteView(@WorkspaceId() ws: string, @CurrentUser() u: RequestUser, @Param('id') id: string) {
    return this.savedViews.remove(ws, u.id, id);
  }

  // ---- Templates ----
  @Get('projects/:projectId/templates')
  listTemplates(@Param('projectId') projectId: string) {
    return this.templates.list(projectId);
  }

  @Post('projects/:projectId/templates')
  @UseGuards(RolesGuard) @MinRole(WorkspaceRole.ADMIN)
  createTemplate(@Param('projectId') projectId: string, @Body() body: any) {
    return this.templates.create(projectId, body);
  }

  @Delete('projects/:projectId/templates/:id')
  @UseGuards(RolesGuard) @MinRole(WorkspaceRole.ADMIN)
  deleteTemplate(@Param('projectId') projectId: string, @Param('id') id: string) {
    return this.templates.remove(projectId, id);
  }

  // Creating a task from a template is normal task work — members may do it.
  @Post('projects/:projectId/templates/:id/instantiate')
  @UseGuards(RolesGuard) @MinRole(WorkspaceRole.MEMBER)
  instantiate(
    @WorkspaceId() ws: string,
    @CurrentUser() u: RequestUser,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.templates.instantiate(ws, u.id, projectId, id, body ?? {});
  }

  // ---- Recurring ----
  @Get('projects/:projectId/recurring')
  listRecurring(@Param('projectId') projectId: string) {
    return this.recurring.list(projectId);
  }

  @Post('projects/:projectId/recurring')
  @UseGuards(RolesGuard) @MinRole(WorkspaceRole.ADMIN)
  createRecurring(@WorkspaceId() ws: string, @CurrentUser() u: RequestUser, @Param('projectId') projectId: string, @Body() body: any) {
    return this.recurring.create(ws, projectId, u.id, body);
  }

  @Delete('projects/:projectId/recurring/:id')
  @UseGuards(RolesGuard) @MinRole(WorkspaceRole.ADMIN)
  deleteRecurring(@Param('projectId') projectId: string, @Param('id') id: string) {
    return this.recurring.remove(projectId, id);
  }
}
