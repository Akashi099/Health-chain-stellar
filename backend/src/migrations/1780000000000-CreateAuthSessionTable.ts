import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateAuthSessionTable1780000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'auth_sessions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'session_id',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'user_id',
            type: 'varchar',
            length: '120',
            isNullable: false,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'role',
            type: 'varchar',
            length: '50',
            isNullable: false,
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
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'expires_at',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'last_activity_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'revoked_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'revocation_reason',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndices('auth_sessions', [
      new TableIndex({
        name: 'IDX_AUTH_SESSION_SESSION_ID',
        columnNames: ['session_id'],
      }),
      new TableIndex({
        name: 'IDX_AUTH_SESSION_USER_ID',
        columnNames: ['user_id'],
      }),
      new TableIndex({
        name: 'IDX_AUTH_SESSION_USER_ID_ACTIVE',
        columnNames: ['user_id', 'is_active'],
      }),
      new TableIndex({
        name: 'IDX_AUTH_SESSION_EXPIRES_AT',
        columnNames: ['expires_at'],
      }),
      new TableIndex({
        name: 'IDX_AUTH_SESSION_CREATED_AT',
        columnNames: ['created_at'],
      }),
      new TableIndex({
        name: 'IDX_AUTH_SESSION_USER_CREATED_AT',
        columnNames: ['user_id', 'created_at'],
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      'auth_sessions',
      'IDX_AUTH_SESSION_USER_CREATED_AT',
    );
    await queryRunner.dropIndex('auth_sessions', 'IDX_AUTH_SESSION_CREATED_AT');
    await queryRunner.dropIndex('auth_sessions', 'IDX_AUTH_SESSION_EXPIRES_AT');
    await queryRunner.dropIndex(
      'auth_sessions',
      'IDX_AUTH_SESSION_USER_ID_ACTIVE',
    );
    await queryRunner.dropIndex('auth_sessions', 'IDX_AUTH_SESSION_USER_ID');
    await queryRunner.dropIndex('auth_sessions', 'IDX_AUTH_SESSION_SESSION_ID');
    await queryRunner.dropTable('auth_sessions');
  }
}
