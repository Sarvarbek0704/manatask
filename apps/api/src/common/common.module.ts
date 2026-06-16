import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspaceMember, User } from '../database/entities';
import { WorkspaceGuard } from './guards/workspace.guard';
import { RolesGuard } from './guards/roles.guard';
import { EmailVerifiedGuard } from './guards/email-verified.guard';

/**
 * Global so that @UseGuards(WorkspaceGuard) / RolesGuard resolve (with their
 * injected repositories) inside every feature module without re-importing.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([WorkspaceMember, User])],
  providers: [WorkspaceGuard, RolesGuard, EmailVerifiedGuard],
  // Re-export TypeOrmModule so the WorkspaceMember/User repositories are globally
  // resolvable wherever the guards are instantiated.
  exports: [WorkspaceGuard, RolesGuard, EmailVerifiedGuard, TypeOrmModule],
})
export class CommonModule {}
