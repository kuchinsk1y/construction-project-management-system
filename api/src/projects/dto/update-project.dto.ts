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

export class UpdateProjectDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  @IsOptional()
  name?: string;

  @IsUUID()
  @IsOptional()
  contractorId?: string;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  projectTypeId?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @IsOptional()
  country?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @MaxLength(3)
  @IsOptional()
  currency?: string;

  @IsOptional()
  @Type(() => Number)
  contractNetValue?: number;

  @IsOptional()
  startDateContract?: string;

  @IsOptional()
  endDateContract?: string;

  @IsOptional()
  @Type(() => Number)
  managerId?: number;
}
