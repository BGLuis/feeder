import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Relation,
} from 'typeorm';
import { UserCredential } from './user-credential.entity';
import { Subscription } from '../../feeds/entities/subscription.entity';
import { UserArticleState } from '../../feeds/entities/user-article-state.entity';
import { Webhook } from '../../webhooks/entities/webhook.entity';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  name?: string;

  @Column({ nullable: true })
  password?: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => UserCredential, (credential) => credential.user)
  credentials: Relation<UserCredential>[];

  @OneToMany(() => Subscription, (subscription) => subscription.user)
  subscriptions: Relation<Subscription>[];

  @OneToMany(() => UserArticleState, (state) => state.user)
  articleStates: Relation<UserArticleState>[];

  @OneToMany(() => Webhook, (webhook) => webhook.user)
  webhooks: Relation<Webhook>[];
}
