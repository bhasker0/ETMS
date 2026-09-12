import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseCategory } from '../../../database/models/expense.model';

export class CreateExpenseDto {
  @ApiProperty({ example: 'DIRECT', enum: ['DIRECT', 'INDIRECT'], description: 'Direct (Production/Factory) or Indirect (Admin/Office)' })
  @IsIn(['DIRECT', 'INDIRECT'])
  category: ExpenseCategory;

  @ApiProperty({ example: 'ELECTRICITY_POWER', description: 'Expense sub-type' })
  @IsString()
  @IsNotEmpty()
  expense_type: string;

  @ApiProperty({ example: 'Torrent Power Ltd', description: 'Payee / Vendor name' })
  @IsString()
  @IsNotEmpty()
  payee_name: string;

  @ApiProperty({ example: '2026-09-02', description: 'Date of expense (YYYY-MM-DD)' })
  @IsString()
  @IsNotEmpty()
  expense_date: string;

  @ApiProperty({ example: 42500.00, description: 'Amount in INR' })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ example: 'BANK_TRANSFER', default: 'CASH' })
  @IsOptional()
  @IsString()
  payment_mode?: string;

  @ApiPropertyOptional({ example: 'Bill #9021882 / UTR 91828372' })
  @IsOptional()
  @IsString()
  reference_no?: string;

  @ApiPropertyOptional({ example: true, default: false })
  @IsOptional()
  @IsBoolean()
  is_gst_applicable?: boolean;

  @ApiPropertyOptional({ example: 7650.00, default: 0 })
  @IsOptional()
  @IsNumber()
  gst_amount?: number;

  @ApiPropertyOptional({ example: 'August 2026 Monthly Machine Power Consumption' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateExpenseDto {
  @ApiPropertyOptional({ enum: ['DIRECT', 'INDIRECT'] })
  @IsOptional()
  @IsIn(['DIRECT', 'INDIRECT'])
  category?: ExpenseCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  expense_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payee_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  expense_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payment_mode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference_no?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_gst_applicable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  gst_amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
