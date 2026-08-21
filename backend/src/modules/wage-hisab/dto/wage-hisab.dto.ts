import { IsString, IsNotEmpty, IsDateString, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateWageHisabDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', description: 'Karigar UUID' })
  @IsString()
  @IsNotEmpty()
  karigar_id: string;

  @ApiProperty({ example: '2026-08-01', description: 'Start Date (e.g. 1st or 16th)' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-08-15', description: 'End Date (e.g. 15th or end of month)' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ example: 250.0, default: 0, description: 'Thread breakage / wastage deductions' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  deductions?: number;

  @ApiPropertyOptional({ example: 'Excess yarn wastage and fabric puncture' })
  @IsOptional()
  @IsString()
  deduction_reason?: string;
}
