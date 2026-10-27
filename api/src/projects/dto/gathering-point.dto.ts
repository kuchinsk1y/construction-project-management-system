import { IsLatitude, IsLongitude, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

/** Gathering point on the construction site. With `id` it updates an existing point, without it creates one. */
export class GatheringPointDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  @IsNotEmpty({ message: 'Podaj nazwę punktu zbiórki.' })
  @MaxLength(150)
  name: string;

  @IsLatitude({ message: 'Podaj lokalizację punktu zbiórki (link Google Maps lub współrzędne).' })
  @Type(() => Number)
  latitude: number;

  @IsLongitude({ message: 'Podaj lokalizację punktu zbiórki (link Google Maps lub współrzędne).' })
  @Type(() => Number)
  longitude: number;
}
