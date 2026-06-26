import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateContractorDto {
  @IsString()
  @MinLength(2, { message: 'Nazwa firmy musi mieć co najmniej 2 znaki' })
  @MaxLength(255, { message: 'Nazwa firmy może mieć maksymalnie 255 znaków' })
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, {
    message: 'NIP / Numer podatkowy może mieć maksymalnie 100 znaków',
  })
  tax_number?: string;
}
