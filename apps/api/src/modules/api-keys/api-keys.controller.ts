import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsEnum, IsString, MinLength } from 'class-validator';
import { WorkspaceRole } from '@manatask/shared';
import { ApiKeysService } from './api-keys.service';
import { WorkspaceId, CurrentUser, RequestUser, MinRole } from '../../common/decorators';
import { WorkspaceGuard } from '../../common/guards/workspace.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

class CreateApiKeyBody {
  @IsString() @MinLength(2) name: string;
  @IsEnum(WorkspaceRole) role: WorkspaceRole;
}

@Controller('workspaces/current/api-keys')
@UseGuards(WorkspaceGuard, RolesGuard)
@MinRole(WorkspaceRole.ADMIN)
export class ApiKeysController {
  constructor(private service: ApiKeysService) {}

  @Post()
  create(@WorkspaceId() ws: string, @CurrentUser() u: RequestUser, @Body() body: CreateApiKeyBody) {
    return this.service.create(ws, u.id, body.name, body.role);
  }

  @Get()
  list(@WorkspaceId() ws: string) {
    return this.service.list(ws);
  }

  @Delete(':id')
  revoke(@WorkspaceId() ws: string, @Param('id') id: string) {
    return this.service.revoke(ws, id);
  }
}
