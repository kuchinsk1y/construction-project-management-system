import {
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  IsArray,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GatheringPointDto } from './gathering-point.dto';

const LOCATION_REQUIRED = 'Podaj lokalizację projektu (link Google Maps lub współrzędne).';

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

  @IsOptional()
  @IsString()
  dokumentationUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  pinUrl?: string;

  // Required: where the construction site is (from a Google Maps link or typed coordinates)
  @IsLatitude({ message: LOCATION_REQUIRED })
  @Type(() => Number)
  latitude: number;

  @IsLongitude({ message: LOCATION_REQUIRED })
  @Type(() => Number)
  longitude: number;

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
