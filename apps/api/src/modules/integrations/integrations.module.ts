import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Workspace, Project, Task, Comment, WorkspaceMember } from '../../database/entities';
import { GithubService } from './github.service';
import { GithubController } from './github.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Workspace, Project, Task, Comment, WorkspaceMember])],
  controllers: [GithubController],
  providers: [GithubService],
})
export class IntegrationsModule {}
