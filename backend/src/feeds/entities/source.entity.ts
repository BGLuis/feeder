import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  OneToMany,
  Relation,
} from 'typeorm';
import { Subscription } from './subscription.entity';
import { Article } from './article.entity';

export enum SourceType {
  RSS = 'RSS',
  SCRAPE = 'SCRAPE',
}

@Entity()
export class Source {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 2048 })
  url: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: SourceType, default: SourceType.RSS })
  type: SourceType;

  @Column({ default: false })
  isPrivate: boolean;

  @Column('json', { nullable: true })
  selectors: any;

  @Column({ nullable: true })
  userScheduleHint: string;

  @Column({ nullable: true })
  cronSchedule: string;

  @Index()
  @Column({ type: 'datetime', nullable: true })
  nextFetchAt: Date;

  @Column({ type: 'datetime', nullable: true })
  lastFetchAt: Date;

  @Column({ default: 0 })
  consecutiveMisses: number;

  @Column({ type: 'text', nullable: true })
  lastError: string | null;

  @Column({ type: 'datetime', nullable: true })
  lastErrorAt: Date | null;

  @OneToMany(() => Subscription, (subscription) => subscription.source)
  subscriptions: Relation<Subscription>[];

  @OneToMany(() => Article, (article) => article.source)
  articles: Relation<Article>[];
}
