import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  type Relation,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity()
// triggerWebhooks() filters active webhooks by owning user.
@Index(['user', 'isActive'])
export class Webhook {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.webhooks, { onDelete: 'CASCADE' })
  user: Relation<User>;

  @Column({ length: 2048 })
  url: string;

  // Stored encrypted at rest (secret-box, v1.* wire format); decrypted only at
  // dispatch time to sign the HMAC. text, not varchar(255): ciphertext is longer.
  @Column('text', { nullable: true })
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
