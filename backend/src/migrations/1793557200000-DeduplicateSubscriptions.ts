import { MigrationInterface, QueryRunner } from 'typeorm';
import { deduplicateSubscriptions } from '../database/deduplicate-subscriptions';

export class DeduplicateSubscriptions1793557200000
	implements MigrationInterface
{
	name = 'DeduplicateSubscriptions1793557200000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		// 1. Merge tags for duplicate subscriptions and remove duplicate rows
		await deduplicateSubscriptions(queryRunner);

		// 2. Drop the non-unique index and promote to UNIQUE
		await queryRunner.query(
			`DROP INDEX \`IDX_40e9f10fab4aba3b1baedd2441\` ON \`subscription\``,
		);
		await queryRunner.query(
			`CREATE UNIQUE INDEX \`IDX_40e9f10fab4aba3b1baedd2441\` ON \`subscription\` (\`userId\`, \`sourceId\`)`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`DROP INDEX \`IDX_40e9f10fab4aba3b1baedd2441\` ON \`subscription\``,
		);
		await queryRunner.query(
			`CREATE INDEX \`IDX_40e9f10fab4aba3b1baedd2441\` ON \`subscription\` (\`userId\`, \`sourceId\`)`,
		);
	}
}
