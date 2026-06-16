import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsArray, IsString, IsUrl } from 'class-validator';
import { WorkspaceRole } from '@manatask/shared';
import { WebhooksService } from './webhooks.service';
import { WorkspaceId, MinRole } from '../../common/decorators';
import { WorkspaceGuard } from '../../common/guards/workspace.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

class CreateWebhookBody {
  @IsUrl({ require_tld: false }) url: string;
  @IsArray() @IsString({ each: true }) events: string[];
}

@Controller('workspaces/current/webhooks')
@UseGuards(WorkspaceGuard, RolesGuard)
@MinRole(WorkspaceRole.ADMIN)
export class WebhooksController {
  constructor(private service: WebhooksService) {}

  @Post()
  create(@WorkspaceId() ws: string, @Body() body: CreateWebhookBody) {
    return this.service.create(ws, body.url, body.events);
  }

  @Get()
  list(@WorkspaceId() ws: string) {
    return this.service.list(ws);
  }

  @Delete(':id')
  remove(@WorkspaceId() ws: string, @Param('id') id: string) {
    return this.service.remove(ws, id);
  }
}
