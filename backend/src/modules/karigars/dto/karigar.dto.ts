import { IsString, IsNotEmpty, IsEnum, IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WageType } from '../../../common/enums/wage-type.enum';

export class CreateKarigarDto {
  @ApiProperty({ example: 'Rameshwar Bhai', description: 'Karigar full name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional()
  @IsString()
  mobile?: string;

  @ApiProperty({ enum: WageType, example: WageType.PIECE_RATE })
  @IsEnum(WageType)
  wage_type: WageType;

  @ApiPropertyOptional({ example: 1.25, description: 'Default rate per meter produced' })
  @IsOptional()
  @IsNumber()
  default_rate_per_meter?: number;

  @ApiPropertyOptional({ example: 18000, description: 'Default monthly fixed salary if FIXED_MONTHLY or FIXED_PLUS_INCENTIVE' })
  @IsOptional()
  @IsNumber()
  default_monthly_salary?: number;

  @ApiPropertyOptional({ example: 100000, description: 'Threshold output before incentive kicks in' })
  @IsOptional()
  @IsNumber()
  incentive_threshold_value?: number;

  @ApiPropertyOptional({ example: 'STITCHES', enum: ['STITCHES', 'PIECES', 'METERS'] })
  @IsOptional()
  @IsString()
  incentive_threshold_type?: string;

  @ApiPropertyOptional({ example: 0.25, description: 'Commission rate above threshold' })
  @IsOptional()
  @IsNumber()
  incentive_rate?: number;

  @ApiPropertyOptional({ example: 'PER_1K_STITCHES', enum: ['PER_1K_STITCHES', 'PER_PIECE', 'PER_METER'] })
  @IsOptional()
  @IsString()
  incentive_rate_type?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateKarigarDto {
  @ApiPropertyOptional({ example: 'Rameshwar Bhai' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional()
  @IsString()
  mobile?: string;

  @ApiPropertyOptional({ enum: WageType, example: WageType.PIECE_RATE })
  @IsOptional()
  @IsEnum(WageType)
  wage_type?: WageType;

  @ApiPropertyOptional({ example: 1.35 })
  @IsOptional()
  @IsNumber()
  default_rate_per_meter?: number;

  @ApiPropertyOptional({ example: 20000 })
  @IsOptional()
  @IsNumber()
  default_monthly_salary?: number;

  @ApiPropertyOptional({ example: 100000 })
  @IsOptional()
  @IsNumber()
  incentive_threshold_value?: number;

  @ApiPropertyOptional({ example: 'STITCHES' })
  @IsOptional()
  @IsString()
  incentive_threshold_type?: string;

  @ApiPropertyOptional({ example: 0.25 })
  @IsOptional()
  @IsNumber()
  incentive_rate?: number;

  @ApiPropertyOptional({ example: 'PER_1K_STITCHES' })
  @IsOptional()
  @IsString()
  incentive_rate_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
