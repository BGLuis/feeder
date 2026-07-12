import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Relation } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Article } from './article.entity';

@Entity()
export class UserArticleState {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, user => user.articleStates, { onDelete: 'CASCADE' })
  user: Relation<User>;

  @ManyToOne(() => Article, article => article.userStates, { onDelete: 'CASCADE' })
  article: Relation<Article>;

  @Column({ default: false })
  isRead: boolean;

  @Column({ default: false })
  isSaved: boolean;
}
