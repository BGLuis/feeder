import { MigrationInterface, QueryRunner } from 'typeorm';
import { deduplicateSubscriptions } from '../database/deduplicate-subscriptions';

export class DeduplicateSubscriptions1793557200000 implements MigrationInterface {
  name = 'DeduplicateSubscriptions1793557200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Merge tags for duplicate subscriptions and remove duplicate rows
    await deduplicateSubscriptions(queryRunner);

    // 2. Drop the non-unique index and promote to UNIQUE
    try {
      await queryRunner.query(
        `DROP INDEX \`IDX_40e9f10fab4aba3b1baedd2441\` ON \`subscription\``,
      );
    } catch (e: any) {
      if (e?.errno !== 1091 && e?.code !== 'ER_CANT_DROP_FIELD_OR_KEY') {
        throw e;
      }
    }

    try {
      await queryRunner.query(
        `CREATE UNIQUE INDEX \`IDX_40e9f10fab4aba3b1baedd2441\` ON \`subscription\` (\`userId\`, \`sourceId\`)`,
      );
    } catch (e: any) {
      if (e?.errno !== 1061 && e?.code !== 'ER_DUP_KEYNAME') {
        throw e;
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    try {
      await queryRunner.query(
        `DROP INDEX \`IDX_40e9f10fab4aba3b1baedd2441\` ON \`subscription\``,
      );
    } catch (e: any) {
      if (e?.errno !== 1091 && e?.code !== 'ER_CANT_DROP_FIELD_OR_KEY') {
        throw e;
      }
    }

    try {
      await queryRunner.query(
        `CREATE INDEX \`IDX_40e9f10fab4aba3b1baedd2441\` ON \`subscription\` (\`userId\`, \`sourceId\`)`,
      );
    } catch (e: any) {
      if (e?.errno !== 1061 && e?.code !== 'ER_DUP_KEYNAME') {
        throw e;
      }
    }
  }
}
