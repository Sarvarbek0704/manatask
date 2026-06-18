import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsHexColor, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { WorkspaceRole } from '@manatask/shared';
import { TeamsService } from './teams.service';
import { WorkspaceId, MinRole } from '../../common/decorators';
import { WorkspaceGuard } from '../../common/guards/workspace.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

class TeamBody {
  @IsString() @MinLength(2) name: string;
  @IsOptional() @IsHexColor() color?: string;
}
class UpdateTeamBody {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsHexColor() color?: string;
}
class TeamMemberBody {
  @IsUUID() userId: string;
}

@Controller('teams')
@UseGuards(WorkspaceGuard)
export class TeamsController {
  constructor(private service: TeamsService) {}

  // Everyone can see the team structure.
  @Get()
  list(@WorkspaceId() ws: string) {
    return this.service.list(ws);
  }

  // Managing teams is admin/owner only.
  @Post()
  @UseGuards(RolesGuard) @MinRole(WorkspaceRole.ADMIN)
  create(@WorkspaceId() ws: string, @Body() body: TeamBody) {
    return this.service.create(ws, body);
  }

  @Patch(':id')
  @UseGuards(RolesGuard) @MinRole(WorkspaceRole.ADMIN)
  update(@WorkspaceId() ws: string, @Param('id') id: string, @Body() body: UpdateTeamBody) {
    return this.service.update(ws, id, body);
  }

  @Delete(':id')
  @UseGuards(RolesGuard) @MinRole(WorkspaceRole.ADMIN)
  remove(@WorkspaceId() ws: string, @Param('id') id: string) {
    return this.service.remove(ws, id);
  }

  @Post(':id/members')
  @UseGuards(RolesGuard) @MinRole(WorkspaceRole.ADMIN)
  addMember(@WorkspaceId() ws: string, @Param('id') id: string, @Body() body: TeamMemberBody) {
    return this.service.addMember(ws, id, body.userId);
  }

  @Delete(':id/members/:userId')
  @UseGuards(RolesGuard) @MinRole(WorkspaceRole.ADMIN)
  removeMember(@WorkspaceId() ws: string, @Param('id') id: string, @Param('userId') userId: string) {
    return this.service.removeMember(ws, id, userId);
  }
}
