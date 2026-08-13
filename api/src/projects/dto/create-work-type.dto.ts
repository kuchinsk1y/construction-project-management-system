import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateWorkTypeDto {
  @IsUUID()
  @IsOptional()
  milestoneId?: string;

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  departmentId!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  unit?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  percentage?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  totalQuantity?: number;

  @IsString()
  @IsOptional()
  plannedStart?: string;

  @IsString()
  @IsOptional()
  plannedEnd?: string;
}
