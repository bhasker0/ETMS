import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsDateString,
  IsOptional,
  Min,
  IsIn,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LotItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  inward_challan_id?: string;

  @ApiPropertyOptional({ example: 'LOT-8310' })
  @IsOptional()
  @IsString()
  lot_no?: string;

  @ApiPropertyOptional({ example: 2000 })
  @IsOptional()
  @IsNumber()
  meters?: number;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsNumber()
  thans?: number;

  @ApiPropertyOptional({ example: 'Georgette 60g' })
  @IsOptional()
  @IsString()
  fabric_quality?: string;

  @ApiPropertyOptional({ example: 'DSG-1050-A' })
  @IsOptional()
  @IsString()
  design_no?: string;

  @ApiPropertyOptional({ example: 0.60 })
  @IsOptional()
  @IsNumber()
  rate?: number;

  @ApiPropertyOptional({ example: 35640 })
  @IsOptional()
  @IsNumber()
  taxable_amount?: number;

  @ApiPropertyOptional({ example: 24000 })
  @IsOptional()
  @IsNumber()
  stitch_count?: number;

  @ApiPropertyOptional({ example: 66 })
  @IsOptional()
  @IsNumber()
  machine_heads?: number;
}

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
  @ApiPropertyOptional({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', description: 'Primary Inward Challan UUID' })
  @IsOptional()
  @IsString()
  inward_challan_id?: string;

  @ApiPropertyOptional({ example: 'Vandana Silk Mills Pvt Ltd' })
  @IsOptional()
  @IsString()
  trader_name?: string;

  @ApiPropertyOptional({ example: '24AABCV1234F1Z8' })
  @IsOptional()
  @IsString()
  trader_gstin?: string;

  @ApiPropertyOptional({ description: 'Consolidated multiple lots', type: [LotItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LotItemDto)
  lot_items?: LotItemDto[];

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
