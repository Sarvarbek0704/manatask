import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task, Project, Comment } from '../../database/entities';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Task, Project, Comment])],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
