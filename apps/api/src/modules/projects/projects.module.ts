import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Project,
  ProjectStatus,
  Sprint,
  Label,
} from '../../database/entities';
import { ProjectsService } from './projects.service';
import { SprintsService } from './sprints.service';
import { LabelsService } from './labels.service';
import { ProjectsController } from './projects.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Project, ProjectStatus, Sprint, Label])],
  controllers: [ProjectsController],
  providers: [ProjectsService, SprintsService, LabelsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
