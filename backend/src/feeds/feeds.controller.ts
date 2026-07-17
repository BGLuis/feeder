import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  Delete,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { FeedsService } from './feeds.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('feeds')
export class FeedsController {
  constructor(private readonly feedsService: FeedsService) {}

  @Post('subscribe')
  async subscribe(@Request() req: any, @Body() body: any) {
    const userId = req.user.id;
    return this.feedsService.subscribe(userId, body);
  }

  @Get()
  async getFeeds(@Request() req: any) {
    return this.feedsService.findAll(req.user.id);
  }

  @Get('articles')
  async getArticles(
    @Request() req: any,
    @Query('tag') tag?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.feedsService.getArticles(
      req.user.id,
      tag,
      search,
      pageNum,
      limitNum,
    );
  }

  @Patch(':id')
  async updateSubscription(
    @Request() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      customName?: string;
      tags?: string[];
      url?: string;
      selectors?: any;
    },
  ) {
    return this.feedsService.updateSubscription(req.user.id, id, body);
  }

  @Post(':id/refresh')
  async refreshSubscription(@Request() req: any, @Param('id') id: string) {
    return this.feedsService.refreshSubscription(req.user.id, id);
  }

  @Delete(':id')
  async deleteSubscription(@Request() req: any, @Param('id') id: string) {
    return this.feedsService.deleteSubscription(req.user.id, id);
  }
}
