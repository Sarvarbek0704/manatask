import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomFieldDefinition, CustomFieldType } from '../../database/entities';

@Injectable()
export class CustomFieldsService {
  constructor(
    @InjectRepository(CustomFieldDefinition) private fields: Repository<CustomFieldDefinition>,
  ) {}

  list(projectId: string) {
    return this.fields.find({ where: { projectId }, order: { order: 'ASC' } });
  }

  async create(projectId: string, dto: { name: string; type?: CustomFieldType; options?: string[] }) {
    const max = await this.fields
      .createQueryBuilder('f')
      .where('f.projectId = :projectId', { projectId })
      .select('COALESCE(MAX(f.order), -1)', 'max')
      .getRawOne<{ max: number }>();
    return this.fields.save(
      this.fields.create({
        projectId,
        name: dto.name,
        type: dto.type ?? CustomFieldType.TEXT,
        options: dto.options ?? [],
        order: Number(max?.max ?? -1) + 1,
      }),
    );
  }

  async update(projectId: string, id: string, dto: Partial<CustomFieldDefinition>) {
    const field = await this.fields.findOne({ where: { id, projectId } });
    if (!field) throw new NotFoundException('Field not found.');
    Object.assign(field, dto);
    return this.fields.save(field);
  }

  async remove(projectId: string, id: string) {
    await this.fields.delete({ id, projectId });
    return { ok: true };
  }
}
