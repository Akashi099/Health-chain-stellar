import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min, IsIn } from 'class-validator';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([10, 25, 50, 100])
  pageSize?: number = 25;
}
