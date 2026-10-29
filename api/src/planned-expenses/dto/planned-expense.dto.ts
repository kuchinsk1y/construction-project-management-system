import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePlannedExpenseDto {
  @IsString()
  @IsNotEmpty()
  costCategoryId: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  plannedPercent: number;
}

export class UpdatePlannedExpenseDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  costCategoryId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  plannedPercent?: number;
}

/** One row of the whole plan saved at once; a new category is given by name */
export class PlannedExpensePlanItemDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  costCategoryId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  costCategoryName?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  plannedPercent: number;
}

/** The complete plan: rows not in the list are removed */
export class SavePlannedExpensesDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => PlannedExpensePlanItemDto)
  items: PlannedExpensePlanItemDto[];
}
