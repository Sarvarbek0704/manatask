import { Controller, Get, Param, Post, Res, HttpCode } from '@nestjs/common';
import type { Response } from 'express';
import { CalendarService } from './calendar.service';
import { CurrentUser, RequestUser, Public } from '../../common/decorators';

@Controller('calendar')
export class CalendarController {
  constructor(private service: CalendarService) {}

  @Get('feed')
  feed(@CurrentUser() u: RequestUser) {
    return this.service.getFeed(u.id);
  }

  @Post('regenerate')
  @HttpCode(200)
  regenerate(@CurrentUser() u: RequestUser) {
    return this.service.regenerate(u.id);
  }

  // Public, capability-token feed for Google/Apple/Outlook calendar subscriptions.
  @Public()
  @Get(':token/manatask.ics')
  async ics(@Param('token') token: string, @Res() res: Response) {
    const body = await this.service.buildIcs(token);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="manatask.ics"');
    res.send(body);
  }
}
