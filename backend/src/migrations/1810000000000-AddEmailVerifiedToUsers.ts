import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddEmailVerifiedToUsers1810000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'email_verified',
        type: 'boolean',
        default: false,
        isNullable: false,
      }),
    );

    // Existing users are considered verified so they are not locked out
    await queryRunner.query(
      `UPDATE users SET email_verified = true WHERE email_verified = false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'email_verified');
  }
}
