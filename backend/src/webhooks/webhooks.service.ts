import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Webhook } from './entities/webhook.entity';
import * as crypto from 'crypto';

@Injectable()
export class WebhooksService {
  constructor(
    @InjectRepository(Webhook) private webhookRepository: Repository<Webhook>,
  ) {}

  async create(
    userId: string,
    data: {
      url: string;
      secret?: string;
      triggerType?: 'ALL' | 'TAG' | 'SOURCE';
      triggerValue?: string;
      payloadTemplate?: string;
    },
  ) {
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
    return this.webhookRepository.find({
      where: { user: { id: userId } },
    });
  }

  async update(
    userId: string,
    webhookId: string,
    data: Partial<{
      url: string;
      secret: string;
      triggerType: 'ALL' | 'TAG' | 'SOURCE';
      triggerValue: string;
      payloadTemplate: string;
      isActive: boolean;
    }>,
  ) {
    const webhook = await this.webhookRepository.findOne({
      where: { id: webhookId, user: { id: userId } as any },
    });
    if (!webhook) throw new Error('Webhook not found');

    if (data.url !== undefined) webhook.url = data.url;
    if (data.secret !== undefined) webhook.secret = data.secret;
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
