import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  type Relation,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity()
export class Webhook {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.webhooks, { onDelete: 'CASCADE' })
  user: Relation<User>;

  @Column()
  url: string;

  @Column({ nullable: true })
  secret: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'enum', enum: ['ALL', 'TAG', 'SOURCE'], default: 'ALL' })
  triggerType: 'ALL' | 'TAG' | 'SOURCE';

  @Column({ nullable: true })
  triggerValue: string;

  @Column('text', { nullable: true })
  payloadTemplate: string;
}
