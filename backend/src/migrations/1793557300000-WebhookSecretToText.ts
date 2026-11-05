import { MigrationInterface, QueryRunner } from 'typeorm';

export class WebhookSecretToText1793557300000 implements MigrationInterface {
  name = 'WebhookSecretToText1793557300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Encrypted secrets (secret-box v1.* wire format) are longer than the
    // original varchar(255) could hold.
    await queryRunner.query(
      `ALTER TABLE \`webhook\` MODIFY \`secret\` text NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`webhook\` MODIFY \`secret\` varchar(255) NULL`,
    );
  }
}
