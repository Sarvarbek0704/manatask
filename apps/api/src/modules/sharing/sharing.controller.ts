import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { WorkspaceRole } from '@manatask/shared';
import { SharingService } from './sharing.service';
import { WorkspaceId, CurrentUser, RequestUser, MinRole, Public } from '../../common/decorators';
import { WorkspaceGuard } from '../../common/guards/workspace.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller()
export class SharingController {
  constructor(private service: SharingService) {}

  // ---- CSV ----
  @Get('projects/:projectId/export.csv')
  @UseGuards(WorkspaceGuard)
  async export(@WorkspaceId() ws: string, @Param('projectId') projectId: string, @Res() res: Response) {
    const csv = await this.service.exportTasksCsv(ws, projectId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="tasks-${projectId}.csv"`);
    res.send(csv);
  }

  @Post('projects/:projectId/import.csv')
  @UseGuards(WorkspaceGuard, RolesGuard)
  @MinRole(WorkspaceRole.MEMBER)
  import(
    @WorkspaceId() ws: string,
    @CurrentUser() u: RequestUser,
    @Param('projectId') projectId: string,
    @Body() body: { csv: string },
  ) {
    return this.service.importTasksCsv(ws, u.id, projectId, body?.csv ?? '');
  }

  // ---- Public shares (management) ----
  @Post('shares')
  @UseGuards(WorkspaceGuard, RolesGuard)
  @MinRole(WorkspaceRole.MEMBER)
  create(
    @WorkspaceId() ws: string,
    @CurrentUser() u: RequestUser,
    @Body() body: { resourceType: 'task' | 'project'; resourceId: string; expiresAt?: string },
  ) {
    return this.service.createShare(ws, u.id, body.resourceType, body.resourceId, body.expiresAt);
  }

  @Get('shares')
  @UseGuards(WorkspaceGuard)
  list(@WorkspaceId() ws: string) {
    return this.service.listShares(ws);
  }

  @Delete('shares/:id')
  @UseGuards(WorkspaceGuard, RolesGuard)
  @MinRole(WorkspaceRole.MEMBER)
  revoke(@WorkspaceId() ws: string, @Param('id') id: string) {
    return this.service.revokeShare(ws, id);
  }

  // ---- Public read (no auth) ----
  @Public()
  @Get('public/:token')
  getPublic(@Param('token') token: string) {
    return this.service.getPublic(token);
  }
}
