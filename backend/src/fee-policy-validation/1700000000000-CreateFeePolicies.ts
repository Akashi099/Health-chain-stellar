import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateFeePolicies1700000000000 implements MigrationInterface {
  name = 'CreateFeePolicies1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'fee_policies',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '120',
            isNullable: false,
          },
          {
            name: 'recipient_type',
            type: 'enum',
            enum: ['provider', 'insurer', 'patient'],
            default: `'provider'`,
          },
          {
            name: 'platform_fee_bp',
            type: 'int',
            default: 0,
            comment: 'Platform fee in basis points (100 bp = 1 %)',
          },
          {
            name: 'insurance_fee_bp',
            type: 'int',
            default: 0,
            comment: 'Insurance processing fee in basis points',
          },
          {
            name: 'flat_fee_stroops',
            type: 'bigint',
            default: 0,
            comment: 'Fixed fee in stroops applied before percentage fees',
          },
          {
            name: 'stellar_network_fee_stroops',
            type: 'int',
            default: 100,
            comment: 'Stellar network fee in stroops (min 100)',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'inactive', 'draft'],
            default: `'draft'`,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
            onUpdate: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'fee_policies',
      new TableIndex({
        name: 'UQ_fee_policies_name_recipient_type',
        columnNames: ['name', 'recipient_type'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('fee_policies');
  }
}
