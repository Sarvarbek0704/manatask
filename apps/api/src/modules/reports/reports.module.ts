import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task, TimeEntry, Sprint } from '../../database/entities';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Task, TimeEntry, Sprint])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
