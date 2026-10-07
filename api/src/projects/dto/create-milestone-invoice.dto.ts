import { IsNotEmpty, IsNumber, IsOptional, IsString, IsDateString } from 'class-validator';

export class CreateMilestoneInvoiceDto {
  @IsString()
  @IsOptional()
  invoiceNumber?: string;

  @IsNumber()
  @IsNotEmpty()
  netValue: number;

  @IsString()
  @IsOptional()
  note?: string;

  @IsDateString()
  @IsOptional()
  issuedDate?: string;

  @IsString()
  @IsOptional()
  link?: string;
  
  @IsString()
  @IsOptional()
  status?: string;
}
