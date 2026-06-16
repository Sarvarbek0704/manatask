import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task, Project, PublicShare } from '../../database/entities';
import { TasksModule } from '../tasks/tasks.module';
import { SharingService } from './sharing.service';
import { SharingController } from './sharing.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Task, Project, PublicShare]), TasksModule],
  controllers: [SharingController],
  providers: [SharingService],
})
export class SharingModule {}
