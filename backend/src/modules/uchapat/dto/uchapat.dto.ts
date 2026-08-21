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
import { PaymentMode } from '../../../common/enums/payment-mode.enum';

export class CreateUchapatDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', description: 'Karigar UUID' })
  @IsString()
  @IsNotEmpty()
  karigar_id: string;

  @ApiProperty({ example: 2000, description: 'Advance amount in INR' })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ example: '2026-08-10', description: 'Advance date (YYYY-MM-DD)' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 'Festival advance / Medical expense' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({ enum: PaymentMode, example: PaymentMode.CASH })
  @IsEnum(PaymentMode)
  payment_mode: PaymentMode;
}

export class UpdateUchapatDto {
  @ApiPropertyOptional({ example: 2500 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  amount?: number;

  @ApiPropertyOptional({ example: '2026-08-12' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ example: 'Updated reason' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ enum: PaymentMode, example: PaymentMode.UPI })
  @IsOptional()
  @IsEnum(PaymentMode)
  payment_mode?: PaymentMode;
}
