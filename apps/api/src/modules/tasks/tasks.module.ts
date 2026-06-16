import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Task,
  Project,
  ProjectStatus,
  Label,
  Comment,
  Attachment,
  ChecklistItem,
  TimeEntry,
  TaskDependency,
  TaskWatcher,
} from '../../database/entities';
import { TasksService } from './tasks.service';
import { TaskItemsService } from './task-items.service';
import { WatchersService } from './watchers.service';
import { TasksController } from './tasks.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { AutomationModule } from '../automation/automation.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Task,
      Project,
      ProjectStatus,
      Label,
      Comment,
      Attachment,
      ChecklistItem,
      TimeEntry,
      TaskDependency,
      TaskWatcher,
    ]),
    NotificationsModule,
    WebhooksModule,
    AutomationModule,
  ],
  controllers: [TasksController],
  providers: [TasksService, TaskItemsService, WatchersService],
  exports: [TasksService],
})
export class TasksModule {}
