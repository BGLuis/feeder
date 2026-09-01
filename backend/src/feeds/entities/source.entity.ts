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

  @Index()
  @Column()
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

  @OneToMany(() => Subscription, (subscription) => subscription.source)
  subscriptions: Relation<Subscription>[];

  @OneToMany(() => Article, (article) => article.source)
  articles: Relation<Article>[];
}
