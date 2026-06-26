import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateWorkTypeDto {
  @IsUUID()
  @IsNotEmpty()
  milestoneId!: string;

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
  @Type(() => Number)
  totalQuantity?: number;

  @IsString()
  @IsOptional()
  plannedStart?: string;

  @IsString()
  @IsOptional()
  plannedEnd?: string;
}
