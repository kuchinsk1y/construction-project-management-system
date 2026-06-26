import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateMilestoneDto {
  @IsString()
  @IsOptional()
  milestoneNo?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  percentage?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  invoicingPercentage?: number;
}
