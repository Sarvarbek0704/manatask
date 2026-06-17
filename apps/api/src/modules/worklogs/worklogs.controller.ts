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
import {
  CreateWorkLogBody,
  UpdateWorkLogBody,
  WorkLogQuery,
  ReviewWorkLogBody,
  UpsertChallengeBody,
} from './dto';
import { WorkspaceId, CurrentUser, CurrentRole, RequestUser, MinRole } from '../../common/decorators';
import { WorkspaceGuard } from '../../common/guards/workspace.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

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

  // ---- Challenge (static routes BEFORE :id) ----
  @Get('challenge')
  challenge(@WorkspaceId() ws: string) {
    return this.service.getChallenge(ws);
  }

  @Patch('challenge')
  @UseGuards(RolesGuard)
  @MinRole(WorkspaceRole.OWNER)
  upsertChallenge(@WorkspaceId() ws: string, @Body() body: UpsertChallengeBody) {
    return this.service.upsertChallenge(ws, body);
  }

  @Get('progress')
  progress(@WorkspaceId() ws: string, @CurrentUser() u: RequestUser, @Query('userId') userId?: string) {
    return this.service.progress(ws, userId || u.id);
  }

  @Post()
  create(@WorkspaceId() ws: string, @CurrentUser() u: RequestUser, @Body() body: CreateWorkLogBody) {
    return this.service.create(ws, u.id, body);
  }

  @Get(':id')
  getOne(@WorkspaceId() ws: string, @Param('id') id: string) {
    return this.service.getOne(ws, id);
  }

  @Patch(':id/review')
  @UseGuards(RolesGuard)
  @MinRole(WorkspaceRole.ADMIN)
  review(
    @WorkspaceId() ws: string,
    @CurrentUser() u: RequestUser,
    @Param('id') id: string,
    @Body() body: ReviewWorkLogBody,
  ) {
    return this.service.review(ws, u.id, id, body.decision, body.note);
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
