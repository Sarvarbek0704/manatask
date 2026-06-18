import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Req,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { WorkspaceRole } from '@manatask/shared';
import { GithubService } from './github.service';
import { WorkspaceId, MinRole, Public } from '../../common/decorators';
import { WorkspaceGuard } from '../../common/guards/workspace.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('integrations/github')
export class GithubController {
  constructor(private service: GithubService) {}

  // ---- Admin config ----
  @Get('config')
  @UseGuards(WorkspaceGuard, RolesGuard)
  @MinRole(WorkspaceRole.ADMIN)
  config(@WorkspaceId() ws: string) {
    return this.service.getConfig(ws);
  }

  @Post('connect')
  @UseGuards(WorkspaceGuard, RolesGuard)
  @MinRole(WorkspaceRole.ADMIN)
  connect(@WorkspaceId() ws: string) {
    return this.service.connect(ws);
  }

  @Delete('connect')
  @UseGuards(WorkspaceGuard, RolesGuard)
  @MinRole(WorkspaceRole.ADMIN)
  disconnect(@WorkspaceId() ws: string) {
    return this.service.disconnect(ws);
  }

  // ---- Inbound webhook from GitHub (HMAC-verified, no session) ----
  @Public()
  @Post(':workspaceId')
  @HttpCode(200)
  webhook(
    @Param('workspaceId') workspaceId: string,
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature: string,
    @Headers('x-github-event') event: string,
    @Body() payload: any,
  ) {
    if (event !== 'push') return { ok: true, ignored: event };
    const raw = req.rawBody ?? Buffer.from(JSON.stringify(payload));
    return this.service.handlePush(workspaceId, raw, signature, payload);
  }
}
