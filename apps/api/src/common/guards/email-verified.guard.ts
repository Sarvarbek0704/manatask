import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities';

/**
 * Blocks the route until the user verifies their email — but only when
 * REQUIRE_EMAIL_VERIFICATION=true. API-key requests bypass this check.
 */
@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(
    private config: ConfigService,
    @InjectRepository(User) private users: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.config.get<boolean>('requireEmailVerification')) return true;
    const req = context.switchToHttp().getRequest();
    if (req.apiKeyAuth) return true;
    const user = await this.users.findOne({ where: { id: req.user?.id } });
    if (!user?.emailVerified) {
      throw new ForbiddenException('Email verification required.');
    }
    return true;
  }
}
