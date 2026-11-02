import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1793557165894 implements MigrationInterface {
	name = 'InitialSchema1793557165894';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE \`user_article_state\` (\`id\` varchar(36) NOT NULL, \`isRead\` tinyint NOT NULL DEFAULT 0, \`isSaved\` tinyint NOT NULL DEFAULT 0, \`userId\` varchar(36) NULL, \`articleId\` varchar(36) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
		);
		await queryRunner.query(
			`CREATE TABLE \`article\` (\`id\` varchar(36) NOT NULL, \`title\` varchar(512) NOT NULL, \`url\` varchar(700) NOT NULL, \`content\` text NULL, \`imageUrl\` text NULL, \`publishedAt\` datetime NULL, \`sourceId\` varchar(36) NULL, INDEX \`IDX_f330baf6be412e8dd60ff7f78e\` (\`publishedAt\`), INDEX \`IDX_c754bedc27ea3a974e5c0915aa\` (\`sourceId\`, \`url\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
		);
		await queryRunner.query(
			`CREATE TABLE \`source\` (\`id\` varchar(36) NOT NULL, \`url\` varchar(2048) NOT NULL, \`name\` varchar(255) NOT NULL, \`type\` enum ('RSS', 'SCRAPE') NOT NULL DEFAULT 'RSS', \`isPrivate\` tinyint NOT NULL DEFAULT 0, \`selectors\` json NULL, \`userScheduleHint\` varchar(255) NULL, \`cronSchedule\` varchar(255) NULL, \`nextFetchAt\` datetime NULL, \`lastFetchAt\` datetime NULL, \`consecutiveMisses\` int NOT NULL DEFAULT '0', \`lastError\` text NULL, \`lastErrorAt\` datetime NULL, INDEX \`IDX_91162ce12f18df58ce8e45a117\` (\`nextFetchAt\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
		);
		await queryRunner.query(
			`CREATE TABLE \`subscription\` (\`id\` varchar(36) NOT NULL, \`tags\` text NULL, \`customName\` varchar(255) NULL, \`authStorageState\` text NULL, \`userId\` varchar(36) NULL, \`sourceId\` varchar(36) NULL, INDEX \`IDX_40e9f10fab4aba3b1baedd2441\` (\`userId\`, \`sourceId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
		);
		await queryRunner.query(
			`CREATE TABLE \`webhook\` (\`id\` varchar(36) NOT NULL, \`url\` varchar(2048) NOT NULL, \`secret\` varchar(255) NULL, \`isActive\` tinyint NOT NULL DEFAULT 1, \`triggerType\` enum ('ALL', 'TAG', 'SOURCE') NOT NULL DEFAULT 'ALL', \`triggerValue\` varchar(255) NULL, \`payloadTemplate\` text NULL, \`userId\` varchar(36) NULL, INDEX \`IDX_377573fc322e96df0f75896fbb\` (\`userId\`, \`isActive\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
		);
		await queryRunner.query(
			`CREATE TABLE \`user\` (\`id\` varchar(36) NOT NULL, \`email\` varchar(255) NOT NULL, \`name\` varchar(255) NULL, \`password\` varchar(255) NULL, \`role\` enum ('admin', 'user') NOT NULL DEFAULT 'user', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_e12875dfb3b1d92d7d7c5377e2\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
		);
		await queryRunner.query(
			`CREATE TABLE \`user_credential\` (\`id\` varchar(36) NOT NULL, \`credentialID\` varchar(255) NOT NULL, \`credentialPublicKey\` blob NOT NULL, \`counter\` int NOT NULL, \`transports\` json NULL, \`userId\` varchar(36) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
		);
		await queryRunner.query(
			`ALTER TABLE \`user_article_state\` ADD CONSTRAINT \`FK_03e874b2026edef135e7eedc1fd\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE \`user_article_state\` ADD CONSTRAINT \`FK_0b5e46c9336b6e0a29105d8254d\` FOREIGN KEY (\`articleId\`) REFERENCES \`article\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE \`article\` ADD CONSTRAINT \`FK_15ba0b4694d853f189422544d31\` FOREIGN KEY (\`sourceId\`) REFERENCES \`source\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE \`subscription\` ADD CONSTRAINT \`FK_cc906b4bc892b048f1b654d2aa0\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE \`subscription\` ADD CONSTRAINT \`FK_c4055497847de81cebceeb94c1f\` FOREIGN KEY (\`sourceId\`) REFERENCES \`source\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE \`webhook\` ADD CONSTRAINT \`FK_f272c8c8805969e6a6449c77b3c\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE \`user_credential\` ADD CONSTRAINT \`FK_8e6ecd93d94d74454b2ad8ba8f8\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE \`user_credential\` DROP FOREIGN KEY \`FK_8e6ecd93d94d74454b2ad8ba8f8\``,
		);
		await queryRunner.query(
			`ALTER TABLE \`webhook\` DROP FOREIGN KEY \`FK_f272c8c8805969e6a6449c77b3c\``,
		);
		await queryRunner.query(
			`ALTER TABLE \`subscription\` DROP FOREIGN KEY \`FK_c4055497847de81cebceeb94c1f\``,
		);
		await queryRunner.query(
			`ALTER TABLE \`subscription\` DROP FOREIGN KEY \`FK_cc906b4bc892b048f1b654d2aa0\``,
		);
		await queryRunner.query(
			`ALTER TABLE \`article\` DROP FOREIGN KEY \`FK_15ba0b4694d853f189422544d31\``,
		);
		await queryRunner.query(
			`ALTER TABLE \`user_article_state\` DROP FOREIGN KEY \`FK_0b5e46c9336b6e0a29105d8254d\``,
		);
		await queryRunner.query(
			`ALTER TABLE \`user_article_state\` DROP FOREIGN KEY \`FK_03e874b2026edef135e7eedc1fd\``,
		);
		await queryRunner.query(`DROP TABLE \`user_credential\``);
		await queryRunner.query(
			`DROP INDEX \`IDX_e12875dfb3b1d92d7d7c5377e2\` ON \`user\``,
		);
		await queryRunner.query(`DROP TABLE \`user\``);
		await queryRunner.query(
			`DROP INDEX \`IDX_377573fc322e96df0f75896fbb\` ON \`webhook\``,
		);
		await queryRunner.query(`DROP TABLE \`webhook\``);
		await queryRunner.query(
			`DROP INDEX \`IDX_40e9f10fab4aba3b1baedd2441\` ON \`subscription\``,
		);
		await queryRunner.query(`DROP TABLE \`subscription\``);
		await queryRunner.query(
			`DROP INDEX \`IDX_91162ce12f18df58ce8e45a117\` ON \`source\``,
		);
		await queryRunner.query(`DROP TABLE \`source\``);
		await queryRunner.query(
			`DROP INDEX \`IDX_c754bedc27ea3a974e5c0915aa\` ON \`article\``,
		);
		await queryRunner.query(
			`DROP INDEX \`IDX_f330baf6be412e8dd60ff7f78e\` ON \`article\``,
		);
		await queryRunner.query(`DROP TABLE \`article\``);
		await queryRunner.query(`DROP TABLE \`user_article_state\``);
	}
}
