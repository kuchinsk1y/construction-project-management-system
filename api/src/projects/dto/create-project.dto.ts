import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @IsUUID()
  contractorId!: string;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  projectTypeId!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  country!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  contractNetValue?: number;

  @IsOptional()
  @IsString()
  startDateContract?: string;

  @IsOptional()
  @IsString()
  endDateContract?: string;

  @IsOptional()
  @IsString()
  startDateFact?: string;

  @IsOptional()
  @IsString()
  endDateFact?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  managerId?: number;
}
