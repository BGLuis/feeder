import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  type Relation,
} from 'typeorm';
import { Source } from './source.entity';
import { UserArticleState } from './user-article-state.entity';

@Entity()
export class Article {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Source, (source) => source.articles, { onDelete: 'CASCADE' })
  source: Relation<Source>;

  @Column()
  title: string;

  @Column()
  url: string;

  @Column('text', { nullable: true })
  content: string;

  @Column('text', { nullable: true })
  imageUrl: string;

  @Column({ type: 'datetime', nullable: true })
  publishedAt: Date;

  @OneToMany(() => UserArticleState, (state) => state.article)
  userStates: Relation<UserArticleState>[];
}
