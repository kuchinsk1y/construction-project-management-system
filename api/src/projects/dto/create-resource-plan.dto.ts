import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateResourcePlanDto {
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  @Type(() => Number)
  plannedWorkers!: number;

  @IsString()
  @IsOptional()
  dateFrom?: string;

  @IsString()
  @IsOptional()
  dateTo?: string;
}
