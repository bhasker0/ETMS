import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePartyDto {
  @ApiProperty({ example: 'Shree Ram Tex Fab', description: 'Party / Trader firm name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: '24ABCDE1234F1Z5', description: '15-digit GSTIN' })
  @IsOptional()
  @IsString()
  @Length(15, 15, { message: 'GSTIN must be exactly 15 characters' })
  gstin?: string;

  @ApiPropertyOptional({ example: '9825198251', description: 'Contact phone / mobile' })
  @IsOptional()
  @IsString()
  mobile?: string;

  @ApiPropertyOptional({ example: 'info@shreeramfab.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: 'Plot 42, GIDC Sachin, Surat' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Surat', default: 'Surat' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: '24', default: '24' })
  @IsOptional()
  @IsString()
  state_code?: string;

  @ApiPropertyOptional({ example: 15, default: 15 })
  @IsOptional()
  @IsNumber()
  credit_period_days?: number;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @IsNumber()
  opening_balance?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdatePartyDto {
  @ApiPropertyOptional({ example: 'Shree Ram Tex Fab Pvt Ltd' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '24ABCDE1234F1Z5' })
  @IsOptional()
  @IsString()
  @Length(15, 15, { message: 'GSTIN must be exactly 15 characters' })
  gstin?: string;

  @ApiPropertyOptional({ example: '9825198251' })
  @IsOptional()
  @IsString()
  mobile?: string;

  @ApiPropertyOptional({ example: 'info@shreeramfab.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: 'Plot 42, GIDC Sachin, Surat' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Surat' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: '24' })
  @IsOptional()
  @IsString()
  state_code?: string;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsNumber()
  credit_period_days?: number;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @IsNumber()
  opening_balance?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
