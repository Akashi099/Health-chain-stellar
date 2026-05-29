import { Table, TableForeignKey, TableIndex } from 'typeorm';

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrganizationReviewsTable1773000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'organization_reviews',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'organization_id', type: 'uuid' },
          { name: 'reviewer_id', type: 'uuid' },
          { name: 'rating', type: 'int' },
          { name: 'review_text', type: 'text', isNullable: true },
          { name: 'is_flagged', type: 'boolean', default: false },
          { name: 'is_hidden', type: 'boolean', default: false },
          { name: 'report_count', type: 'int', default: 0 },
          {
            name: 'moderation_status',
            type: 'varchar',
            length: '20',
            default: `'VISIBLE'`,
          },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'updated_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'organization_reviews',
      new TableIndex({
        name: 'IDX_ORG_REVIEWS_ORG_ID',
        columnNames: ['organization_id'],
      }),
    );

    await queryRunner.createIndex(
      'organization_reviews',
      new TableIndex({
        name: 'IDX_ORG_REVIEWS_REVIEWER_ID',
        columnNames: ['reviewer_id'],
      }),
    );

    await queryRunner.createIndex(
      'organization_reviews',
      new TableIndex({
        name: 'UQ_ORG_REVIEW_ORG_REVIEWER',
        columnNames: ['organization_id', 'reviewer_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKey(
      'organization_reviews',
      new TableForeignKey({
        name: 'FK_ORG_REVIEW_ORGANIZATION',
        columnNames: ['organization_id'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'organization_reviews',
      new TableForeignKey({
        name: 'FK_ORG_REVIEW_REVIEWER',
        columnNames: ['reviewer_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'organization_review_reports',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'review_id', type: 'uuid' },
          { name: 'reporter_id', type: 'uuid' },
          { name: 'reason', type: 'text', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'organization_review_reports',
      new TableIndex({
        name: 'UQ_ORG_REVIEW_REPORT_REVIEW_REPORTER',
        columnNames: ['review_id', 'reporter_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKey(
      'organization_review_reports',
      new TableForeignKey({
        name: 'FK_ORG_REVIEW_REPORT_REVIEW',
        columnNames: ['review_id'],
        referencedTableName: 'organization_reviews',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'organization_review_reports',
      new TableForeignKey({
        name: 'FK_ORG_REVIEW_REPORT_REPORTER',
        columnNames: ['reporter_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'organization_review_moderation_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'review_id', type: 'uuid' },
          { name: 'admin_user_id', type: 'uuid', isNullable: true },
          { name: 'action', type: 'varchar', length: '50' },
          { name: 'reason', type: 'text', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'organization_review_moderation_logs',
      new TableForeignKey({
        name: 'FK_ORG_REVIEW_LOG_REVIEW',
        columnNames: ['review_id'],
        referencedTableName: 'organization_reviews',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'organization_review_moderation_logs',
      new TableForeignKey({
        name: 'FK_ORG_REVIEW_LOG_ADMIN',
        columnNames: ['admin_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey(
      'organization_review_moderation_logs',
      'FK_ORG_REVIEW_LOG_ADMIN',
    );
    await queryRunner.dropForeignKey(
      'organization_review_moderation_logs',
      'FK_ORG_REVIEW_LOG_REVIEW',
    );
    await queryRunner.dropTable('organization_review_moderation_logs', true);

    await queryRunner.dropForeignKey(
      'organization_review_reports',
      'FK_ORG_REVIEW_REPORT_REPORTER',
    );
    await queryRunner.dropForeignKey(
      'organization_review_reports',
      'FK_ORG_REVIEW_REPORT_REVIEW',
    );
    await queryRunner.dropIndex(
      'organization_review_reports',
      'UQ_ORG_REVIEW_REPORT_REVIEW_REPORTER',
    );
    await queryRunner.dropTable('organization_review_reports', true);

    await queryRunner.dropForeignKey(
      'organization_reviews',
      'FK_ORG_REVIEW_REVIEWER',
    );
    await queryRunner.dropForeignKey(
      'organization_reviews',
      'FK_ORG_REVIEW_ORGANIZATION',
    );
    await queryRunner.dropIndex(
      'organization_reviews',
      'UQ_ORG_REVIEW_ORG_REVIEWER',
    );
    await queryRunner.dropIndex(
      'organization_reviews',
      'IDX_ORG_REVIEWS_REVIEWER_ID',
    );
    await queryRunner.dropIndex(
      'organization_reviews',
      'IDX_ORG_REVIEWS_ORG_ID',
    );
    await queryRunner.dropTable('organization_reviews', true);
  }
}
