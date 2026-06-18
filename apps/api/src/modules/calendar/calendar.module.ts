import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User, Task } from '../../database/entities';
import { CalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Task])],
  controllers: [CalendarController],
  providers: [CalendarService],
})
export class CalendarModule {}
