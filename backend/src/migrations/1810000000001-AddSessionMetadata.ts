import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddSessionMetadata1810000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'auth_sessions',
      new TableColumn({
        name: 'geo_hint',
        type: 'varchar',
        length: '128',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('auth_sessions', 'geo_hint');
  }
}
