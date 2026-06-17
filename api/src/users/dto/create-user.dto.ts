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

export class CreateUserDto {
  @IsEmail({}, { message: 'Invalid email address' })
  @MaxLength(255)
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  firstName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  lastName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  middleNames?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  position!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(16)
  phoneNumber!: string;

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
