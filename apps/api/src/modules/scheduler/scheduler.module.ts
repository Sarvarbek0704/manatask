import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task, Invitation } from '../../database/entities';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';
import { MaintenanceService } from './maintenance.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, Invitation]),
    NotificationsModule,
    AuthModule,
  ],
  providers: [MaintenanceService],
})
export class SchedulerModule {}
