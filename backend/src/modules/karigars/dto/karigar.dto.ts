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

  @ApiPropertyOptional({ example: 18000, description: 'Default monthly fixed salary if FIXED_MONTHLY' })
  @IsOptional()
  @IsNumber()
  default_monthly_salary?: number;

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

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
