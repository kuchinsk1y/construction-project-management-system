import {
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

  @IsNumber()
  @Min(0)
  @Max(100)
  percentage: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  invoicingPercentage?: number;
}
