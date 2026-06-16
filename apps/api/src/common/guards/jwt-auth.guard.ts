import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators';
import { ApiKeysService } from '../../modules/api-keys/api-keys.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private apiKeys: ApiKeysService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // API-key auth: `x-api-key: <key>` or `Authorization: ApiKey <key>`.
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers['authorization'] as string | undefined;
    const rawKey =
      (req.headers['x-api-key'] as string | undefined) ||
      (authHeader?.startsWith('ApiKey ') ? authHeader.slice(7) : undefined);

    if (rawKey) {
      const auth = await this.apiKeys.authenticate(rawKey);
      if (!auth) throw new UnauthorizedException('Invalid API key.');
      req.user = { id: auth.userId, email: '' };
      req.apiKeyAuth = auth;
      return true;
    }

    return (await super.canActivate(context)) as boolean;
  }
}
