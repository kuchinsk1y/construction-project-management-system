import { IsString, IsNotEmpty, IsNumber, Min, Max, IsOptional } from 'class-validator';

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
