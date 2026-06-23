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
import { TasksService } from './tasks.service';
import { TaskItemsService } from './task-items.service';
import { WatchersService } from './watchers.service';
import {
  CreateTaskBody,
  UpdateTaskBody,
  MoveTaskBody,
  TaskQueryParams,
  CreateCommentBody,
  CreateChecklistItemBody,
  UpdateChecklistItemBody,
  CreateDependencyBody,
  LogTimeBody,
} from './dto';
import { WorkspaceRole } from '@manatask/shared';
import { CurrentUser, CurrentRole, RequestUser, WorkspaceId } from '../../common/decorators';
import { WorkspaceGuard } from '../../common/guards/workspace.guard';

@Controller('tasks')
@UseGuards(WorkspaceGuard)
export class TasksController {
  constructor(
    private tasks: TasksService,
    private items: TaskItemsService,
    private watchers: WatchersService,
  ) {}

  // ---- Watchers ----
  @Post(':id/watch')
  watch(@WorkspaceId() ws: string, @CurrentUser() u: RequestUser, @Param('id') id: string) {
    return this.watchers.watch(ws, u.id, id);
  }

  @Delete(':id/watch')
  unwatch(@WorkspaceId() ws: string, @CurrentUser() u: RequestUser, @Param('id') id: string) {
    return this.watchers.unwatch(ws, u.id, id);
  }

  @Get(':id/watchers')
  listWatchers(@WorkspaceId() ws: string, @Param('id') id: string) {
    return this.watchers.list(ws, id);
  }

  @Get()
  query(@WorkspaceId() ws: string, @Query() q: TaskQueryParams) {
    return this.tasks.query(ws, q);
  }

  @Post()
  create(@WorkspaceId() ws: string, @CurrentUser() u: RequestUser, @Body() body: CreateTaskBody) {
    return this.tasks.create(ws, u.id, body);
  }

  // NOTE: must precede ':id' so "trash" isn't matched as a task id.
  @Get('trash')
  trash(@WorkspaceId() ws: string, @Query('projectId') projectId?: string) {
    return this.tasks.listTrash(ws, projectId);
  }

  @Post(':id/restore')
  restore(@WorkspaceId() ws: string, @CurrentUser() u: RequestUser, @Param('id') id: string) {
    return this.tasks.restore(ws, u.id, id);
  }

  @Get(':id')
  getOne(@WorkspaceId() ws: string, @Param('id') id: string) {
    return this.tasks.getOne(ws, id);
  }

  @Get(':id/activity')
  activity(@WorkspaceId() ws: string, @Param('id') id: string) {
    return this.tasks.listActivity(ws, id);
  }

  @Get(':id/subtasks')
  subtasks(@WorkspaceId() ws: string, @Param('id') id: string) {
    return this.tasks.listSubtasks(ws, id);
  }

  @Patch(':id')
  update(
    @WorkspaceId() ws: string,
    @CurrentUser() u: RequestUser,
    @CurrentRole() role: WorkspaceRole,
    @Param('id') id: string,
    @Body() body: UpdateTaskBody,
  ) {
    return this.tasks.update(ws, u.id, role, id, body);
  }

  @Patch(':id/move')
  move(
    @WorkspaceId() ws: string,
    @CurrentUser() u: RequestUser,
    @CurrentRole() role: WorkspaceRole,
    @Param('id') id: string,
    @Body() body: MoveTaskBody,
  ) {
    return this.tasks.move(ws, u.id, role, id, body);
  }

  @Patch(':id/archive')
  archive(
    @WorkspaceId() ws: string,
    @CurrentUser() u: RequestUser,
    @Param('id') id: string,
    @Body() body: { archived?: boolean },
  ) {
    return this.tasks.setArchived(ws, u.id, id, body.archived !== false);
  }

  @Delete(':id')
  remove(@WorkspaceId() ws: string, @CurrentUser() u: RequestUser, @Param('id') id: string) {
    return this.tasks.remove(ws, u.id, id);
  }

  // ---- Comments ----
  @Get(':id/comments')
  comments(@WorkspaceId() ws: string, @Param('id') id: string) {
    return this.items.listComments(ws, id);
  }

  @Post(':id/comments')
  addComment(@WorkspaceId() ws: string, @CurrentUser() u: RequestUser, @Param('id') id: string, @Body() body: CreateCommentBody) {
    return this.items.addComment(ws, u.id, id, body);
  }

  @Delete(':id/comments/:commentId')
  deleteComment(@WorkspaceId() ws: string, @Param('id') id: string, @Param('commentId') commentId: string) {
    return this.items.deleteComment(ws, id, commentId);
  }

  // ---- Checklist ----
  @Post(':id/checklist')
  addChecklist(@WorkspaceId() ws: string, @Param('id') id: string, @Body() body: CreateChecklistItemBody) {
    return this.items.addChecklistItem(ws, id, body);
  }

  @Patch(':id/checklist/:itemId')
  updateChecklist(@WorkspaceId() ws: string, @Param('id') id: string, @Param('itemId') itemId: string, @Body() body: UpdateChecklistItemBody) {
    return this.items.updateChecklistItem(ws, id, itemId, body);
  }

  @Delete(':id/checklist/:itemId')
  deleteChecklist(@WorkspaceId() ws: string, @Param('id') id: string, @Param('itemId') itemId: string) {
    return this.items.deleteChecklistItem(ws, id, itemId);
  }

  // ---- Time ----
  @Get(':id/time')
  listTime(@WorkspaceId() ws: string, @Param('id') id: string) {
    return this.items.listTime(ws, id);
  }

  @Post(':id/time')
  logTime(@WorkspaceId() ws: string, @CurrentUser() u: RequestUser, @Param('id') id: string, @Body() body: LogTimeBody) {
    return this.items.logTime(ws, u.id, id, body);
  }

  // ---- Dependencies ----
  @Get(':id/dependencies')
  deps(@WorkspaceId() ws: string, @Param('id') id: string) {
    return this.items.listDependencies(ws, id);
  }

  @Post(':id/dependencies')
  addDep(@WorkspaceId() ws: string, @Param('id') id: string, @Body() body: CreateDependencyBody) {
    return this.items.addDependency(ws, id, body);
  }

  @Delete(':id/dependencies/:depId')
  removeDep(@WorkspaceId() ws: string, @Param('id') id: string, @Param('depId') depId: string) {
    return this.items.removeDependency(ws, id, depId);
  }
}
