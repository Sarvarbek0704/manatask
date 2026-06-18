import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Team as TeamDto } from '@manatask/shared';
import { Team, TeamMember, WorkspaceMember } from '../../database/entities';
import { toUserPublic } from '../../common/mappers';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team) private teams: Repository<Team>,
    @InjectRepository(TeamMember) private teamMembers: Repository<TeamMember>,
    @InjectRepository(WorkspaceMember) private members: Repository<WorkspaceMember>,
  ) {}

  async list(workspaceId: string): Promise<TeamDto[]> {
    const teams = await this.teams.find({ where: { workspaceId }, order: { createdAt: 'ASC' } });
    if (!teams.length) return [];
    const tms = await this.teamMembers.find({
      where: { teamId: In(teams.map((t) => t.id)) },
    });
    const byTeam = new Map<string, TeamMember[]>();
    for (const tm of tms) {
      const arr = byTeam.get(tm.teamId) ?? [];
      arr.push(tm);
      byTeam.set(tm.teamId, arr);
    }
    return teams.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      members: (byTeam.get(t.id) ?? []).map((tm) => toUserPublic(tm.user)!),
      createdAt: new Date(t.createdAt).toISOString(),
    }));
  }

  async create(workspaceId: string, dto: { name: string; color?: string }) {
    const team = await this.teams.save(
      this.teams.create({ workspaceId, name: dto.name.trim(), color: dto.color || '#138067' }),
    );
    return { id: team.id, name: team.name, color: team.color, members: [], createdAt: new Date(team.createdAt).toISOString() };
  }

  async update(workspaceId: string, id: string, dto: { name?: string; color?: string }) {
    const team = await this.teams.findOne({ where: { id, workspaceId } });
    if (!team) throw new NotFoundException('Team not found.');
    if (dto.name !== undefined) team.name = dto.name.trim();
    if (dto.color !== undefined) team.color = dto.color;
    await this.teams.save(team);
    return { ok: true };
  }

  async remove(workspaceId: string, id: string) {
    await this.teams.delete({ id, workspaceId });
    return { ok: true };
  }

  async addMember(workspaceId: string, teamId: string, userId: string) {
    const team = await this.teams.findOne({ where: { id: teamId, workspaceId } });
    if (!team) throw new NotFoundException('Team not found.');
    const isMember = await this.members.findOne({ where: { workspaceId, userId } });
    if (!isMember) throw new BadRequestException('User is not a workspace member.');
    const existing = await this.teamMembers.findOne({ where: { teamId, userId } });
    if (!existing) await this.teamMembers.save(this.teamMembers.create({ teamId, userId }));
    return { ok: true };
  }

  async removeMember(workspaceId: string, teamId: string, userId: string) {
    const team = await this.teams.findOne({ where: { id: teamId, workspaceId } });
    if (!team) throw new NotFoundException('Team not found.');
    await this.teamMembers.delete({ teamId, userId });
    return { ok: true };
  }
}
