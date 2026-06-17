import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkLog, WorkspaceMember, Challenge } from '../../database/entities';
import { NotificationsModule } from '../notifications/notifications.module';
import { WorkLogsService } from './worklogs.service';
import { WorkLogsController } from './worklogs.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WorkLog, WorkspaceMember, Challenge]), NotificationsModule],
  controllers: [WorkLogsController],
  providers: [WorkLogsService],
})
export class WorkLogsModule {}
