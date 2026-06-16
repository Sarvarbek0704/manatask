import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Label } from '../../database/entities';
import { toLabel } from '../../common/mappers';
import { CreateLabelBody } from './dto';

@Injectable()
export class LabelsService {
  constructor(@InjectRepository(Label) private labels: Repository<Label>) {}

  async list(workspaceId: string) {
    const labels = await this.labels.find({
      where: { workspaceId },
      order: { name: 'ASC' },
    });
    return labels.map(toLabel);
  }

  async create(workspaceId: string, body: CreateLabelBody) {
    const saved = await this.labels.save(
      this.labels.create({ workspaceId, name: body.name, color: body.color }),
    );
    return toLabel(saved);
  }

  async remove(workspaceId: string, id: string) {
    await this.labels.delete({ id, workspaceId });
    return { ok: true };
  }
}
