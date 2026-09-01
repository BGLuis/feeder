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
import {
  ListArticlesQueryDto,
  SubscribeDto,
  UpdateSubscriptionDto,
} from './dto/feeds.dto';

@UseGuards(JwtAuthGuard)
@Controller('feeds')
export class FeedsController {
  constructor(private readonly feedsService: FeedsService) {}

  @Post('subscribe')
  async subscribe(@Request() req: any, @Body() body: SubscribeDto) {
    return this.feedsService.subscribe(req.user.id, body);
  }

  @Get()
  async getFeeds(@Request() req: any) {
    return this.feedsService.findAll(req.user.id);
  }

  @Get('articles')
  async getArticles(@Request() req: any, @Query() query: ListArticlesQueryDto) {
    return this.feedsService.getArticles(req.user.id, query);
  }

  @Patch(':id')
  async updateSubscription(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: UpdateSubscriptionDto,
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
