import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SearchService } from './search.service';
import { WorkspaceId } from '../../common/decorators';
import { WorkspaceGuard } from '../../common/guards/workspace.guard';

@Controller('search')
@UseGuards(WorkspaceGuard)
export class SearchController {
  constructor(private service: SearchService) {}

  @Get()
  search(@WorkspaceId() ws: string, @Query('q') q: string) {
    return this.service.search(ws, q);
  }
}
