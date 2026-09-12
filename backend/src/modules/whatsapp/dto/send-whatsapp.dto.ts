import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendWhatsappDocumentDto {
  @ApiProperty({ example: '9825012345', description: 'Recipient phone number (without + or 91, or full E.164)' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'JV-INV-2026-0042.pdf', description: 'Filename of document' })
  @IsString()
  @IsNotEmpty()
  filename: string;

  @ApiProperty({ description: 'Base64 encoded PDF document payload' })
  @IsString()
  @IsNotEmpty()
  document_base64: string;

  @ApiPropertyOptional({ example: 'Please find attached your Tax Invoice for SAC 9988 job work.' })
  @IsOptional()
  @IsString()
  caption?: string;
}

export class SendInvoiceWhatsappDto {
  @ApiPropertyOptional({ example: '9825012345' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Tax Invoice from Radhe Krishna Embroidery' })
  @IsOptional()
  @IsString()
  caption?: string;
}

export class SendChallanWhatsappDto {
  @ApiPropertyOptional({ example: '9825012345' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Inward Delivery Challan from Radhe Krishna Embroidery' })
  @IsOptional()
  @IsString()
  caption?: string;
}

export class SendPartyStatementWhatsappDto {
  @ApiPropertyOptional({ example: '9825012345' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: '2026-08-01' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-08-31' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ example: 'Job-Work Statement of Account' })
  @IsOptional()
  @IsString()
  caption?: string;
}
