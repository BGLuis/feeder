import { Entity, PrimaryGeneratedColumn, Column, OneToMany, Relation } from 'typeorm';
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

  @OneToMany(() => Subscription, subscription => subscription.source)
  subscriptions: Relation<Subscription>[];

  @OneToMany(() => Article, article => article.source)
  articles: Relation<Article>[];
}
