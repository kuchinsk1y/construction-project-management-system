import {
  ArrayMaxSize,
  IsArray,
  IsUUID,
  ValidateNested,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

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
  invoicingPercentage?: number | null;
}

/** One milestone of the whole list saved at once; without id it is created */
export class MilestonePlanItemDto extends CreateMilestoneDto {
  @IsOptional()
  @IsUUID()
  id?: string;
}

/** The complete list of milestones and additional works: rows not sent are removed */
export class SaveMilestonesDto {
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => MilestonePlanItemDto)
  items: MilestonePlanItemDto[];
}
