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
import { WorkLogsService } from './worklogs.service';
import { CreateWorkLogBody, UpdateWorkLogBody, WorkLogQuery } from './dto';
import { WorkspaceId, CurrentUser, CurrentRole, RequestUser } from '../../common/decorators';
import { WorkspaceGuard } from '../../common/guards/workspace.guard';

@Controller('worklogs')
@UseGuards(WorkspaceGuard)
export class WorkLogsController {
  constructor(private service: WorkLogsService) {}

  @Get()
  list(@WorkspaceId() ws: string, @Query() q: WorkLogQuery) {
    return this.service.list(ws, q);
  }

  @Get('summary')
  summary(@WorkspaceId() ws: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.summary(ws, { from, to });
  }

  @Post()
  create(@WorkspaceId() ws: string, @CurrentUser() u: RequestUser, @Body() body: CreateWorkLogBody) {
    return this.service.create(ws, u.id, body);
  }

  @Patch(':id')
  update(@WorkspaceId() ws: string, @CurrentUser() u: RequestUser, @Param('id') id: string, @Body() body: UpdateWorkLogBody) {
    return this.service.update(ws, u.id, id, body);
  }

  @Delete(':id')
  remove(
    @WorkspaceId() ws: string,
    @CurrentUser() u: RequestUser,
    @CurrentRole() role: WorkspaceRole,
    @Param('id') id: string,
  ) {
    return this.service.remove(ws, u.id, role, id);
  }
}
