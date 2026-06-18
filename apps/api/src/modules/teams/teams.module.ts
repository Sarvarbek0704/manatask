import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Team, TeamMember, WorkspaceMember } from '../../database/entities';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Team, TeamMember, WorkspaceMember])],
  controllers: [TeamsController],
  providers: [TeamsService],
})
export class TeamsModule {}
