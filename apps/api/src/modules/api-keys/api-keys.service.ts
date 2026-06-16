import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { createHash } from 'crypto';
import { customAlphabet } from 'nanoid';
import { WorkspaceRole } from '@manatask/shared';
import { ApiKey } from '../../database/entities';

const gen = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz0123456789', 32);
const prefixGen = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 6);

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export interface ApiKeyAuth {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
}

@Injectable()
export class ApiKeysService {
  constructor(@InjectRepository(ApiKey) private keys: Repository<ApiKey>) {}

  async create(workspaceId: string, userId: string, name: string, role: WorkspaceRole) {
    const prefix = prefixGen();
    const secret = gen();
    const full = `mt_${prefix}_${secret}`;
    const saved = await this.keys.save(
      this.keys.create({
        workspaceId,
        name,
        keyPrefix: `mt_${prefix}`,
        keyHash: sha256(full),
        role,
        createdById: userId,
      }),
    );
    // Plaintext key is returned exactly once.
    return { id: saved.id, name: saved.name, prefix: saved.keyPrefix, role: saved.role, key: full };
  }

  async list(workspaceId: string) {
    const rows = await this.keys.find({
      where: { workspaceId, revokedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
    return rows.map((k) => ({
      id: k.id,
      name: k.name,
      prefix: k.keyPrefix,
      role: k.role,
      lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
      createdAt: k.createdAt.toISOString(),
    }));
  }

  async revoke(workspaceId: string, id: string) {
    const key = await this.keys.findOne({ where: { id, workspaceId } });
    if (!key) throw new NotFoundException('API key not found.');
    key.revokedAt = new Date();
    await this.keys.save(key);
    return { ok: true };
  }

  /** Validates a raw key for request auth. Returns null if invalid/revoked. */
  async authenticate(raw: string): Promise<ApiKeyAuth | null> {
    if (!raw?.startsWith('mt_')) return null;
    const key = await this.keys
      .createQueryBuilder('k')
      .addSelect('k.keyHash')
      .where('k.keyHash = :hash', { hash: sha256(raw) })
      .andWhere('k.revokedAt IS NULL')
      .getOne();
    if (!key) return null;
    // Best-effort last-used timestamp (don't block the request).
    this.keys.update({ id: key.id }, { lastUsedAt: new Date() }).catch(() => undefined);
    return { workspaceId: key.workspaceId, userId: key.createdById, role: key.role };
  }
}
