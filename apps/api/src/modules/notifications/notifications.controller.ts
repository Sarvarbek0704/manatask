import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser, RequestUser } from '../../common/decorators';

@Controller('notifications')
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query('unread') unread?: string) {
    return this.service.list(user.id, unread === 'true');
  }

  @Get('unread-count')
  async count(@CurrentUser() user: RequestUser) {
    return { count: await this.service.unreadCount(user.id) };
  }

  @Patch(':id/read')
  read(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.markRead(user.id, id);
  }

  @Patch('read-all')
  readAll(@CurrentUser() user: RequestUser) {
    return this.service.markAllRead(user.id);
  }
}
