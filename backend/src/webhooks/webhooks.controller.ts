import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateWebhookDto, UpdateWebhookDto } from './dto/webhooks.dto';

@UseGuards(JwtAuthGuard)
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  async createWebhook(@Request() req: any, @Body() body: CreateWebhookDto) {
    return this.webhooksService.create(req.user.id, body);
  }

  @Get()
  async getWebhooks(@Request() req: any) {
    return this.webhooksService.findAll(req.user.id);
  }

  @Put(':id')
  async updateWebhook(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: UpdateWebhookDto,
  ) {
    return this.webhooksService.update(req.user.id, id, body);
  }

  @Delete(':id')
  async deleteWebhook(@Request() req: any, @Param('id') id: string) {
    return this.webhooksService.remove(req.user.id, id);
  }
}
