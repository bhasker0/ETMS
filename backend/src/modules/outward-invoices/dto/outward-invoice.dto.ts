import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsDateString,
  IsOptional,
  Min,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CalculateInvoicePreviewDto {
  @ApiProperty({ example: 450000, description: 'Total stitch count' })
  @IsNumber()
  @Min(1)
  total_stitches: number;

  @ApiProperty({ example: 0.35, description: 'Job-work rate per 1000 stitches in INR' })
  @IsNumber()
  @Min(0.0001)
  rate_per_1000: number;

  @ApiProperty({ example: 32, enum: [24, 32, 44, 66], description: 'Machine head count' })
  @IsNumber()
  @IsIn([24, 32, 44, 66])
  machine_heads: number;

  @ApiProperty({ example: 1000.0, description: 'Raw inward fabric meters' })
  @IsNumber()
  @Min(0.1)
  inward_meters: number;

  @ApiProperty({ example: 965.0, description: 'Finished outward fabric meters' })
  @IsNumber()
  @Min(0.1)
  outward_meters: number;

  @ApiPropertyOptional({ example: '24AABCV1234F1Z8', description: 'Trader GSTIN for intra/inter-state GST' })
  @IsOptional()
  @IsString()
  trader_gstin?: string;
}

export class CreateOutwardInvoiceDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', description: 'Inward Challan UUID' })
  @IsString()
  @IsNotEmpty()
  inward_challan_id: string;

  @ApiPropertyOptional({ example: 'INV-2026-0042', description: 'Auto-generated if empty' })
  @IsOptional()
  @IsString()
  invoice_no?: string;

  @ApiProperty({ example: '2026-08-15' })
  @IsDateString()
  invoice_date: string;

  @ApiProperty({ example: 450000, description: 'Total stitch count' })
  @IsNumber()
  @Min(1)
  total_stitches: number;

  @ApiProperty({ example: 0.35, description: 'Job-work rate per 1000 stitches in INR' })
  @IsNumber()
  @Min(0.0001)
  rate_per_1000: number;

  @ApiProperty({ example: 32, enum: [24, 32, 44, 66], description: 'Machine heads' })
  @IsNumber()
  @IsIn([24, 32, 44, 66])
  machine_heads: number;

  @ApiProperty({ example: 965.0, description: 'Finished outward dispatched meters' })
  @IsNumber()
  @Min(0.1)
  outward_meters: number;

  @ApiPropertyOptional({ example: '9988', default: '9988' })
  @IsOptional()
  @IsString()
  sac_code?: string;
}
