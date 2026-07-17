import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  type Relation,
} from 'typeorm';
import { User } from './user.entity';

@Entity()
export class UserCredential {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.credentials, { onDelete: 'CASCADE' })
  user: Relation<User>;

  @Column()
  credentialID: string;

  @Column('blob')
  credentialPublicKey: Buffer;

  @Column('int')
  counter: number;

  @Column('json', { nullable: true })
  transports: any;
}
