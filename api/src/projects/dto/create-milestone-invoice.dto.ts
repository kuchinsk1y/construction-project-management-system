import { IsNotEmpty, IsNumber, IsOptional, IsString, IsDateString } from 'class-validator';

export class CreateMilestoneInvoiceDto {
  @IsString()
  @IsNotEmpty()
  invoiceNumber: string;

  @IsNumber()
  @IsNotEmpty()
  netValue: number;

  @IsString()
  @IsOptional()
  note?: string;

  @IsDateString()
  @IsNotEmpty()
  issuedDate: string;
}
