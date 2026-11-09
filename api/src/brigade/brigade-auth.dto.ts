import { IsString, Length, Matches } from 'class-validator';

/** E.164 after removing spaces and dashes, e.g. +48123456789 */
const PHONE = /^\+?[1-9][\d\s-]{6,20}$/;

export class BrigadeSendCodeDto {
  @IsString()
  @Matches(PHONE, { message: 'Podaj numer telefonu w formacie międzynarodowym, np. +48 123 456 789' })
  phone: string;
}

export class BrigadeVerifyCodeDto {
  @IsString()
  @Matches(PHONE, { message: 'Podaj numer telefonu w formacie międzynarodowym, np. +48 123 456 789' })
  phone: string;

  @IsString()
  @Length(6, 6, { message: 'Kod ma 6 znaków' })
  code: string;
}

export class BrigadeRefreshDto {
  @IsString()
  @Length(36, 36)
  refreshToken: string;
}
