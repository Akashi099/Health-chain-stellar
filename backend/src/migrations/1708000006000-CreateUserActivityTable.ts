import type { MigrationInterface, QueryRunner } from 'typeorm';
import { Table, TableIndex } from 'typeorm';

export class CreateUserActivityTable1708000006000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'user_activities',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'varchar',
            length: '120',
            isNullable: true,
          },
          {
            name: 'activity_type',
            type: 'enum',
            enum: [
              'AUTH_LOGIN_SUCCESS',
              'AUTH_LOGIN_FAILED',
              'AUTH_LOGOUT',
              'AUTH_PASSWORD_CHANGED',
              'AUTH_ACCOUNT_LOCKED',
              'AUTH_ACCOUNT_AUTO_UNLOCKED',
              'AUTH_ACCOUNT_MANUALLY_UNLOCKED',
              'AUTH_SESSION_REVOKED',
              'AUTH_REFRESH_TOKEN_REPLAY',
              'PROFILE_UPDATED',
              'PERMISSION_CHANGED',
            ],
          },
          {
            name: 'description',
            type: 'text',
          },
          {
            name: 'ip_address',
            type: 'varchar',
            length: '64',
            isNullable: true,
          },
          {
            name: 'user_agent',
            type: 'varchar',
            length: '1024',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndices('user_activities', [
      new TableIndex({
        name: 'IDX_USER_ACTIVITY_USER_ID',
        columnNames: ['user_id'],
      }),
      new TableIndex({
        name: 'IDX_USER_ACTIVITY_ACTIVITY_TYPE',
        columnNames: ['activity_type'],
      }),
      new TableIndex({
        name: 'IDX_USER_ACTIVITY_CREATED_AT',
        columnNames: ['created_at'],
      }),
      new TableIndex({
        name: 'IDX_USER_ACTIVITY_USER_TYPE_CREATED_AT',
        columnNames: ['user_id', 'activity_type', 'created_at'],
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      'user_activities',
      'IDX_USER_ACTIVITY_USER_TYPE_CREATED_AT',
    );
    await queryRunner.dropIndex(
      'user_activities',
      'IDX_USER_ACTIVITY_CREATED_AT',
    );
    await queryRunner.dropIndex(
      'user_activities',
      'IDX_USER_ACTIVITY_ACTIVITY_TYPE',
    );
    await queryRunner.dropIndex('user_activities', 'IDX_USER_ACTIVITY_USER_ID');
    await queryRunner.dropTable('user_activities');
  }
}
