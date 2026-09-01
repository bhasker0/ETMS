import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsDateString,
  IsEnum,
  IsOptional,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChallanStatus } from '../../../common/enums/challan-status.enum';

export class CreateInwardChallanDto {
  @ApiPropertyOptional({ example: 'CH-2026-001', description: 'Auto-generated if empty' })
  @IsOptional()
  @IsString()
  challan_no?: string;

  @ApiPropertyOptional({ example: '2026-08-10', description: 'Defaults to today if empty' })
  @IsOptional()
  @IsDateString()
  challan_date?: string;

  @ApiProperty({ example: 'Vandana Silk Mills Pvt Ltd', description: 'Textile Trader / Party Name' })
  @IsString()
  @IsNotEmpty()
  trader_name: string;

  @ApiPropertyOptional({ example: '24AABCV1234F1Z8', description: 'Trader GSTIN' })
  @IsOptional()
  @IsString()
  trader_gstin?: string;

  @ApiProperty({ example: 'LOT-9988', description: 'Trader Fabric Lot Number' })
  @IsString()
  @IsNotEmpty()
  lot_no: string;

  @ApiProperty({ example: 10, description: 'Number of Than / rolls received' })
  @IsNumber()
  @Min(1)
  than_count: number;

  @ApiProperty({ example: 1000.0, description: 'Raw inward meters of grey fabric' })
  @IsNumber()
  @Min(0.1)
  inward_meters: number;

  @ApiProperty({ example: 'Georgette 60g / Heavy Organza', description: 'Fabric Quality / Type' })
  @IsString()
  @IsNotEmpty()
  fabric_quality: string;

  @ApiProperty({ example: 'DS-5002', description: 'Design number to embroider' })
  @IsString()
  @IsNotEmpty()
  design_no: string;

  @ApiPropertyOptional({ example: 24000, description: 'Stitches per design repeat/saree' })
  @IsOptional()
  @IsNumber()
  stitch_count?: number;

  @ApiPropertyOptional({ example: 0.25, description: 'Karigar incentive commission rate' })
  @IsOptional()
  @IsNumber()
  karigar_commission_rate?: number;

  @ApiPropertyOptional({ example: 'PER_1K_STITCHES' })
  @IsOptional()
  @IsString()
  karigar_commission_type?: string;

  @ApiPropertyOptional({ example: 0.60, description: 'Jobwork bill price per 1k stitches' })
  @IsOptional()
  @IsNumber()
  jobwork_price_per_1k?: number;

  @ApiPropertyOptional({ description: 'Multi-design lot items' })
  @IsOptional()
  items?: Array<{
    design_no: string;
    stitch_count: number;
    commission_type: string;
    commission_rate: number;
    jobwork_price_per_1k: number;
    meters: number;
    than_count: number;
  }>;

  @ApiPropertyOptional({ enum: ChallanStatus, default: ChallanStatus.RECEIVED })
  @IsOptional()
  @IsEnum(ChallanStatus)
  status?: ChallanStatus;

  @ApiPropertyOptional({ example: 'Urgent delivery required before Raksha Bandhan' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateInwardChallanDto {
  @ApiPropertyOptional({ example: 'Vandana Silk Mills Pvt Ltd' })
  @IsOptional()
  @IsString()
  trader_name?: string;

  @ApiPropertyOptional({ example: '24AABCV1234F1Z8' })
  @IsOptional()
  @IsString()
  trader_gstin?: string;

  @ApiPropertyOptional({ example: 'LOT-9988' })
  @IsOptional()
  @IsString()
  lot_no?: string;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsNumber()
  than_count?: number;

  @ApiPropertyOptional({ example: 1200.0 })
  @IsOptional()
  @IsNumber()
  inward_meters?: number;

  @ApiPropertyOptional({ example: 'Georgette 60g' })
  @IsOptional()
  @IsString()
  fabric_quality?: string;

  @ApiPropertyOptional({ example: 'DS-5002' })
  @IsOptional()
  @IsString()
  design_no?: string;

  @ApiPropertyOptional({ enum: ChallanStatus })
  @IsOptional()
  @IsEnum(ChallanStatus)
  status?: ChallanStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
