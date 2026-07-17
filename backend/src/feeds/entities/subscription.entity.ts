import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  type Relation,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Source } from './source.entity';

@Entity()
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.subscriptions, { onDelete: 'CASCADE' })
  user: Relation<User>;

  @ManyToOne(() => Source, (source) => source.subscriptions, {
    onDelete: 'CASCADE',
  })
  source: Relation<Source>;

  @Column('simple-array', { nullable: true })
  tags: string[];

  @Column({ nullable: true })
  customName: string;

  @Column('text', { nullable: true })
  authStorageState: string;
}
