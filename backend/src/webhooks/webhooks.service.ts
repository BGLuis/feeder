import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Webhook } from './entities/webhook.entity';
import { CreateWebhookDto, UpdateWebhookDto } from './dto/webhooks.dto';

@Injectable()
export class WebhooksService {
  constructor(
    @InjectRepository(Webhook) private webhookRepository: Repository<Webhook>,
  ) {}

  async create(userId: string, data: CreateWebhookDto) {
    const webhook = new Webhook();
    webhook.user = { id: userId } as any;
    webhook.url = data.url;
    webhook.secret = data.secret || crypto.randomBytes(32).toString('hex');
    webhook.triggerType = data.triggerType || 'ALL';
    webhook.triggerValue = data.triggerValue || '';
    webhook.payloadTemplate = data.payloadTemplate || '';
    webhook.isActive = true;

    return this.webhookRepository.save(webhook);
  }

  async findAll(userId: string) {
    return this.webhookRepository.find({ where: { user: { id: userId } } });
  }

  async update(userId: string, webhookId: string, data: UpdateWebhookDto) {
    const webhook = await this.webhookRepository.findOne({
      where: { id: webhookId, user: { id: userId } as any },
    });
    if (!webhook) throw new NotFoundException('Webhook not found');

    if (data.url !== undefined) webhook.url = data.url;
    // DTO guarantees a non-empty secret of >= 16 chars when present; never
    // allow downgrading to an empty/weak signing key.
    if (data.secret) webhook.secret = data.secret;
    if (data.triggerType !== undefined) webhook.triggerType = data.triggerType;
    if (data.triggerValue !== undefined)
      webhook.triggerValue = data.triggerValue;
    if (data.payloadTemplate !== undefined)
      webhook.payloadTemplate = data.payloadTemplate;
    if (data.isActive !== undefined) webhook.isActive = data.isActive;

    return this.webhookRepository.save(webhook);
  }

  async remove(userId: string, webhookId: string) {
    return this.webhookRepository.delete({
      id: webhookId,
      user: { id: userId } as any,
    });
  }
}
