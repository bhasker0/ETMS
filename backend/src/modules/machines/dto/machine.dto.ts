import { IsString, IsNotEmpty, IsNumber, IsIn, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMachineDto {
  @ApiProperty({ example: 'M-01', description: 'Machine identifier number/code' })
  @IsString()
  @IsNotEmpty()
  machine_no: string;

  @ApiProperty({ example: 32, enum: [24, 32, 44, 66], description: 'Surat standard head counts' })
  @IsNumber()
  @IsIn([24, 32, 44, 66])
  head_count: number;

  @ApiPropertyOptional({ example: 850, default: 850 })
  @IsOptional()
  @IsNumber()
  rpm?: number;

  @ApiPropertyOptional({ example: 'Sanjay Embroidery High Speed' })
  @IsOptional()
  @IsString()
  make_model?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateMachineDto {
  @ApiPropertyOptional({ example: 'M-01' })
  @IsOptional()
  @IsString()
  machine_no?: string;

  @ApiPropertyOptional({ example: 32, enum: [24, 32, 44, 66] })
  @IsOptional()
  @IsNumber()
  @IsIn([24, 32, 44, 66])
  head_count?: number;

  @ApiPropertyOptional({ example: 900 })
  @IsOptional()
  @IsNumber()
  rpm?: number;

  @ApiPropertyOptional({ example: 'Sanjay 2026 Model' })
  @IsOptional()
  @IsString()
  make_model?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
