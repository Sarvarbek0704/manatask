import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { WorkspaceRole } from '@manatask/shared';

export class CreateWorkspaceBody {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  slug?: string;
}

export class InviteBody {
  @IsEmail()
  email: string;

  @IsEnum(WorkspaceRole)
  role: WorkspaceRole;
}

export class UpdateMemberRoleBody {
  @IsEnum(WorkspaceRole)
  role: WorkspaceRole;
}
