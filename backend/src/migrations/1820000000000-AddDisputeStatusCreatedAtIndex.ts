import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDisputeStatusCreatedAtIndex1820000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_disputes_status_created_at" ON "disputes" ("status", "created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_disputes_status_created_at"`);
  }
}
