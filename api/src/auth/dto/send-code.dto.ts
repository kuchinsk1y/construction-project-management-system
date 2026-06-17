import { IsEmail } from 'class-validator';

export class SendCodeDto {
  @IsEmail({}, { message: 'Invalid email address' })
  email!: string;
}
