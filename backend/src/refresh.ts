import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Queue } from 'bullmq';
import { getQueueToken } from '@nestjs/bullmq';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Source } from './feeds/entities/source.entity';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const sourceRepo: Repository<Source> = app.get(getRepositoryToken(Source));
  const scraperQueue: Queue = app.get(getQueueToken('scraper'));

  const sources = await sourceRepo.find();
  for (const source of sources) {
    console.log('Queuing', source.url);
    await scraperQueue.add('fetch', { url: source.url, sourceId: source.id });
  }

  await app.close();
}
run();
