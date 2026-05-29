import { Repository, SelectQueryBuilder, SaveOptions } from 'typeorm';

export class SoftDeleteRepository<Entity extends { deletedAt?: Date | null }> extends Repository<Entity> {
  /**
   * Find records excluding soft-deleted ones
   */
  async findActiveMany(options?: any): Promise<Entity[]> {
    return this.find({
      ...options,
      where: {
        ...options?.where,
        deletedAt: null,
      },
    });
  }

  /**
   * Find one record excluding soft-deleted ones
   */
  async findActiveOne(options?: any): Promise<Entity | null> {
    return this.findOne({
      ...options,
      where: {
        ...options?.where,
        deletedAt: null,
      },
    });
  }

  /**
   * Create query builder with soft-delete filter applied
   */
  createActiveQueryBuilder(alias: string): SelectQueryBuilder<Entity> {
    return this.createQueryBuilder(alias).where(`${alias}.deletedAt IS NULL`);
  }

  /**
   * Soft delete a record
   */
  async softDelete(id: string | string[]): Promise<void> {
    const ids = Array.isArray(id) ? id : [id];
    await this.update({ id: ids } as any, { deletedAt: new Date() } as any);
  }

  /**
   * Restore a soft-deleted record
   */
  async restore(id: string | string[]): Promise<void> {
    const ids = Array.isArray(id) ? id : [id];
    await this.update({ id: ids } as any, { deletedAt: null } as any);
  }
}
