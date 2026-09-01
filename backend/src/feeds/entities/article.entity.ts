import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  type Relation,
} from 'typeorm';
import { Source } from './source.entity';
import { UserArticleState } from './user-article-state.entity';

@Entity()
// Fast "does this article already exist for this source" lookup (the dedupe
// query). Kept non-unique so `synchronize: true` still applies on databases
// that already contain duplicate (source, url) rows; promote to UNIQUE via a
// migration after cleaning those up. App-level dedupe + an ER_DUP_ENTRY catch
// in ScraperProcessor.saveArticle still guard against races.
@Index(['source', 'url'])
export class Article {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Source, (source) => source.articles, { onDelete: 'CASCADE' })
  source: Relation<Source>;

  @Column()
  title: string;

  @Column({ length: 700 })
  url: string;

  @Column('text', { nullable: true })
  content: string;

  @Column('text', { nullable: true })
  imageUrl: string | null;

  @Index()
  @Column({ type: 'datetime', nullable: true })
  publishedAt: Date;

  @OneToMany(() => UserArticleState, (state) => state.article)
  userStates: Relation<UserArticleState>[];
}
