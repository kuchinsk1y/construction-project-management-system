import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateContractorDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Nazwa firmy musi mieć co najmniej 2 znaki' })
  @MaxLength(255, { message: 'Nazwa firmy może mieć maksymalnie 255 znaków' })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, {
    message: 'NIP / Numer podatkowy może mieć maksymalnie 100 znaków',
  })
  tax_number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Nazwa ulicy może mieć maksymalnie 255 znaków' })
  street?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Kod pocztowy może mieć maksymalnie 20 znaków' })
  postal_code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Nazwa miejscowości może mieć maksymalnie 100 znaków' })
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Nazwa kraju może mieć maksymalnie 100 znaków' })
  country?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
