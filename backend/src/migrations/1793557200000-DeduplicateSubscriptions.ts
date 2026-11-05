import { MigrationInterface, QueryRunner } from 'typeorm';
import { deduplicateSubscriptions } from '../database/deduplicate-subscriptions';

export class DeduplicateSubscriptions1793557200000 implements MigrationInterface {
  name = 'DeduplicateSubscriptions1793557200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Merge tags for duplicate subscriptions and remove duplicate rows
    await deduplicateSubscriptions(queryRunner);

    // 2. Promote the index to UNIQUE. It also backs the userId foreign key,
    // so MySQL refuses a standalone DROP INDEX; dropping and re-adding it in
    // one ALTER TABLE keeps the foreign key covered throughout.
    await queryRunner.query(
      `ALTER TABLE \`subscription\` DROP INDEX \`IDX_40e9f10fab4aba3b1baedd2441\`, ADD UNIQUE INDEX \`IDX_40e9f10fab4aba3b1baedd2441\` (\`userId\`, \`sourceId\`)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`subscription\` DROP INDEX \`IDX_40e9f10fab4aba3b1baedd2441\`, ADD INDEX \`IDX_40e9f10fab4aba3b1baedd2441\` (\`userId\`, \`sourceId\`)`,
    );
  }
}
