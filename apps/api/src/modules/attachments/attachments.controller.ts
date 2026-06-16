import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { AttachmentsService } from './attachments.service';
import { CurrentUser, RequestUser, WorkspaceId, Public } from '../../common/decorators';
import { WorkspaceGuard } from '../../common/guards/workspace.guard';

@Controller()
export class AttachmentsController {
  constructor(private service: AttachmentsService) {}

  @Post('tasks/:taskId/attachments')
  @UseGuards(WorkspaceGuard)
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @WorkspaceId() ws: string,
    @CurrentUser() user: RequestUser,
    @Param('taskId') taskId: string,
    @UploadedFile() file: any,
  ) {
    return this.service.upload(ws, user.id, taskId, file);
  }

  @Get('tasks/:taskId/attachments')
  @UseGuards(WorkspaceGuard)
  list(@WorkspaceId() ws: string, @Param('taskId') taskId: string) {
    return this.service.list(ws, taskId);
  }

  @Delete('tasks/:taskId/attachments/:id')
  @UseGuards(WorkspaceGuard)
  remove(@WorkspaceId() ws: string, @Param('taskId') taskId: string, @Param('id') id: string) {
    return this.service.remove(ws, taskId, id);
  }

  /** Public download via short-lived signed token (works in <a>/<img>). */
  @Public()
  @Get('attachments/:id')
  async download(@Param('id') id: string, @Query('t') token: string, @Res() res: Response) {
    const result = await this.service.resolveDownload(id, token);
    if (result.kind === 'redirect') {
      return res.redirect(result.redirectUrl);
    }
    res.setHeader('Content-Type', result.attachment.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(result.attachment.filename)}"`,
    );
    result.stream.pipe(res);
  }
}
