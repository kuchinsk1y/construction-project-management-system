import { Type } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateIf } from 'class-validator';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DATE_MESSAGE = 'Data musi mieć format RRRR-MM-DD';

export class CreateSurchargeDto {
  @IsString()
  @IsNotEmpty({ message: 'Podaj nazwę dopłaty' })
  @MaxLength(150)
  name: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Stawka musi być liczbą (maks. 2 miejsca po przecinku)' })
  @Min(0, { message: 'Stawka nie może być ujemna' })
  @Max(99999999)
  ratePerHour: number;

  @Matches(DATE, { message: DATE_MESSAGE })
  validFrom: string;

  /** Empty / null = no end date */
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @Matches(DATE, { message: DATE_MESSAGE })
  validTo?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateSurchargeDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Podaj nazwę dopłaty' })
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Stawka musi być liczbą (maks. 2 miejsca po przecinku)' })
  @Min(0, { message: 'Stawka nie może być ujemna' })
  @Max(99999999)
  ratePerHour?: number;

  @IsOptional()
  @Matches(DATE, { message: DATE_MESSAGE })
  validFrom?: string;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @Matches(DATE, { message: DATE_MESSAGE })
  validTo?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
