import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email address' })
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  middleNames?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  position?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(16)
  phoneNumber?: string;

  @IsOptional()
  @IsNumberString()
  @MaxLength(20)
  telegramId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
