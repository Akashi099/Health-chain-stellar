export interface PaginationMetadata {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMetadata;
}

export class PaginationUtil {
  static createMetadata(
    currentPage: number,
    pageSize: number,
    totalCount: number,
  ): PaginationMetadata {
    const totalPages = Math.ceil(totalCount / pageSize);
    return {
      currentPage,
      pageSize,
      totalCount,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    };
  }

  static createResponse<T>(
    data: T[],
    currentPage: number,
    pageSize: number,
    totalCount: number,
  ): PaginatedResponse<T> {
    return {
      data,
      pagination: this.createMetadata(currentPage, pageSize, totalCount),
    };
  }

  static calculateSkip(page: number, pageSize: number): number {
    return (page - 1) * pageSize;
  }
}
