import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddVerificationSyncFields1810000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add verification sync tracking columns
    await queryRunner.addColumn(
      'organizations',
      new TableColumn({
        name: 'verification_source',
        type: 'varchar',
        length: '50',
        default: `'backend'`,
        comment: 'Source of verification: backend or soroban',
      }),
    );

    await queryRunner.addColumn(
      'organizations',
      new TableColumn({
        name: 'synced_at',
        type: 'timestamp',
        isNullable: true,
        comment: 'Last successful sync to blockchain',
      }),
    );

    await queryRunner.addColumn(
      'organizations',
      new TableColumn({
        name: 'verification_tx_hash',
        type: 'varchar',
        length: '128',
        isNullable: true,
        comment: 'Transaction hash of verification on-chain',
      }),
    );

    await queryRunner.addColumn(
      'organizations',
      new TableColumn({
        name: 'sync_status',
        type: 'varchar',
        length: '50',
        default: `'pending'`,
        comment: 'Sync status: pending, syncing, synced, failed, mismatch',
      }),
    );

    await queryRunner.addColumn(
      'organizations',
      new TableColumn({
        name: 'sync_error_message',
        type: 'text',
        isNullable: true,
        comment: 'Error message from last failed sync',
      }),
    );

    await queryRunner.addColumn(
      'organizations',
      new TableColumn({
        name: 'sync_retry_count',
        type: 'int',
        default: 0,
        comment: 'Number of sync retry attempts',
      }),
    );

    await queryRunner.addColumn(
      'organizations',
      new TableColumn({
        name: 'soroban_verified_at',
        type: 'timestamp',
        isNullable: true,
        comment: 'Timestamp when verified on Soroban',
      }),
    );

    // Create indexes for sync tracking
    await queryRunner.createIndex(
      'organizations',
      new TableIndex({
        name: 'IDX_ORGANIZATIONS_SYNC_STATUS',
        columnNames: ['sync_status'],
      }),
    );

    await queryRunner.createIndex(
      'organizations',
      new TableIndex({
        name: 'IDX_ORGANIZATIONS_SYNCED_AT',
        columnNames: ['synced_at'],
      }),
    );

    await queryRunner.createIndex(
      'organizations',
      new TableIndex({
        name: 'IDX_ORGANIZATIONS_VERIFICATION_TX_HASH',
        columnNames: ['verification_tx_hash'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('organizations', 'IDX_ORGANIZATIONS_VERIFICATION_TX_HASH');
    await queryRunner.dropIndex('organizations', 'IDX_ORGANIZATIONS_SYNCED_AT');
    await queryRunner.dropIndex('organizations', 'IDX_ORGANIZATIONS_SYNC_STATUS');

    await queryRunner.dropColumn('organizations', 'soroban_verified_at');
    await queryRunner.dropColumn('organizations', 'sync_retry_count');
    await queryRunner.dropColumn('organizations', 'sync_error_message');
    await queryRunner.dropColumn('organizations', 'sync_status');
    await queryRunner.dropColumn('organizations', 'verification_tx_hash');
    await queryRunner.dropColumn('organizations', 'synced_at');
    await queryRunner.dropColumn('organizations', 'verification_source');
  }
}
