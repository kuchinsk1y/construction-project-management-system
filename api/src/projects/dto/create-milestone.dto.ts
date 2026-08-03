import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateMilestoneDto {
  @IsString()
  @IsNotEmpty()
  milestoneNo: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  @IsIn(['KM', 'roboty_dodatkowe'])
  type?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  percentage?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  netAmount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  invoicingPercentage?: number;
}
