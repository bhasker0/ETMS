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
import { ShiftType } from '../../../common/enums/shift-type.enum';

export class CreateShiftLogDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', description: 'Machine UUID' })
  @IsString()
  @IsNotEmpty()
  machine_id: string;

  @ApiPropertyOptional({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', description: 'Optional Inward Challan UUID' })
  @IsOptional()
  @IsString()
  inward_challan_id?: string;

  @ApiProperty({ enum: ShiftType, example: ShiftType.DAY })
  @IsEnum(ShiftType)
  shift_type: ShiftType;

  @ApiProperty({ example: '2026-08-10' })
  @IsDateString()
  shift_date: string;

  @ApiProperty({ example: 'DS-4029', description: 'Design Number' })
  @IsString()
  @IsNotEmpty()
  design_no: string;

  @ApiProperty({ example: 100000, description: 'Machine counter at start of shift' })
  @IsNumber()
  @Min(0)
  start_counter: number;

  @ApiProperty({ example: 350000, description: 'Machine counter at end of shift' })
  @IsNumber()
  @Min(0)
  end_counter: number;

  @ApiProperty({ example: 120.5, description: 'Total linear meters produced' })
  @IsNumber()
  @Min(0)
  total_meters: number;

  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', description: 'Karigar UUID' })
  @IsString()
  @IsNotEmpty()
  karigar_id: string;

  @ApiPropertyOptional({ example: 30, description: 'Machine downtime in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  downtime_minutes?: number;

  @ApiPropertyOptional({ example: 'Thread breakage and bobbin refill' })
  @IsOptional()
  @IsString()
  downtime_reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  operator_notes?: string;
}

export class UpdateShiftLogDto {
  @ApiPropertyOptional({ enum: ShiftType })
  @IsOptional()
  @IsEnum(ShiftType)
  shift_type?: ShiftType;

  @ApiPropertyOptional({ example: '2026-08-10' })
  @IsOptional()
  @IsDateString()
  shift_date?: string;

  @ApiPropertyOptional({ example: 'DS-4029' })
  @IsOptional()
  @IsString()
  design_no?: string;

  @ApiPropertyOptional({ example: 100000 })
  @IsOptional()
  @IsNumber()
  start_counter?: number;

  @ApiPropertyOptional({ example: 380000 })
  @IsOptional()
  @IsNumber()
  end_counter?: number;

  @ApiPropertyOptional({ example: 135.0 })
  @IsOptional()
  @IsNumber()
  total_meters?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  karigar_id?: string;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsNumber()
  downtime_minutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  downtime_reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  operator_notes?: string;
}
