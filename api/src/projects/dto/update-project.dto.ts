import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Max,
  Min,
  MinLength,
  IsArray,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GatheringPointDto } from './gathering-point.dto';

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
  startDateFact?: string;

  @IsOptional()
  endDateFact?: string;

  @IsOptional()
  @Type(() => Number)
  managerId?: number;

  @IsOptional()
  @IsString()
  dokumentationUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  pinUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  longitude?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  power?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  warrantyPercent?: number;

  /** Gathering points on site. On update the list replaces the saved one (missing points are removed). */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => GatheringPointDto)
  gatheringPoints?: GatheringPointDto[];
}
