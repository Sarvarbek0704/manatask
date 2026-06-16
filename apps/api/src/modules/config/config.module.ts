import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  CustomFieldDefinition,
  SavedView,
  TaskTemplate,
  RecurringTask,
} from '../../database/entities';
import { TasksModule } from '../tasks/tasks.module';
import { CustomFieldsService } from './custom-fields.service';
import { SavedViewsService } from './saved-views.service';
import { TemplatesService } from './templates.service';
import { RecurringService } from './recurring.service';
import { ConfigController } from './config.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([CustomFieldDefinition, SavedView, TaskTemplate, RecurringTask]),
    TasksModule,
  ],
  controllers: [ConfigController],
  providers: [CustomFieldsService, SavedViewsService, TemplatesService, RecurringService],
})
export class ConfigModule {}
