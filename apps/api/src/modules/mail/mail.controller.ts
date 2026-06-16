import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { MailService } from './mail.service';
import { Public } from '../../common/decorators';

/**
 * Email diagnostics — lets you confirm the active transport and trigger a real
 * test send (returning the actual provider error) without reading server logs.
 * The test endpoint is gated by the DIAG_KEY env var (disabled if unset).
 */
@Controller('mail')
export class MailController {
  constructor(private mail: MailService) {}

  @Public()
  @Get('status')
  status() {
    return this.mail.getStatus();
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('test')
  @HttpCode(200)
  async test(@Body() body: { to?: string; key?: string }) {
    const diag = process.env.DIAG_KEY;
    if (!diag || body.key !== diag) throw new NotFoundException();
    try {
      await this.mail.send(
        body.to!,
        'manaTask test email',
        '<p>Success — manaTask email delivery is working.</p>',
      );
      return { ok: true };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }
}
