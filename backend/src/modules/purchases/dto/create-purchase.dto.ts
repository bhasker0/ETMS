import { IsString, IsNotEmpty, IsOptional, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PurchaseItemDto {
  @ApiProperty({ example: 'Polyester Embroidery Thread 120D/2 (White)' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ example: 'YARN_DHAGA' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: '54011000' })
  @IsOptional()
  @IsString()
  hsn?: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  qty: number;

  @ApiProperty({ example: 'KG' })
  @IsString()
  unit: string;

  @ApiProperty({ example: 280 })
  @IsNumber()
  rate: number;

  @ApiProperty({ example: 28000 })
  @IsNumber()
  taxable_amount: number;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsNumber()
  gst_rate?: number;

  @ApiPropertyOptional({ example: 3360 })
  @IsOptional()
  @IsNumber()
  gst_amount?: number;

  @ApiProperty({ example: 31360 })
  @IsNumber()
  total: number;
}

export class CreatePurchaseDto {
  @ApiProperty({ example: 'Shree Ambaji Thread Mill', description: 'Supplier / Vendor firm name' })
  @IsString()
  @IsNotEmpty()
  supplier_name: string;

  @ApiPropertyOptional({ example: '24AABCS1234F1Z5' })
  @IsOptional()
  @IsString()
  supplier_gstin?: string;

  @ApiPropertyOptional({ example: '9825011223' })
  @IsOptional()
  @IsString()
  supplier_phone?: string;

  @ApiProperty({ example: 'INV-8821' })
  @IsString()
  @IsNotEmpty()
  invoice_no: string;

  @ApiProperty({ example: '2026-09-02' })
  @IsString()
  @IsNotEmpty()
  invoice_date: string;

  @ApiPropertyOptional({ example: 'YARN_DHAGA' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'PENDING' })
  @IsOptional()
  @IsString()
  payment_status?: string;

  @ApiPropertyOptional({ example: 'BANK_TRANSFER' })
  @IsOptional()
  @IsString()
  payment_mode?: string;

  @ApiProperty({ type: [PurchaseItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items: PurchaseItemDto[];

  @ApiPropertyOptional({ example: 28000 })
  @IsOptional()
  @IsNumber()
  subtotal?: number;

  @ApiPropertyOptional({ example: 3360 })
  @IsOptional()
  @IsNumber()
  gst_amount?: number;

  @ApiPropertyOptional({ example: 31360 })
  @IsOptional()
  @IsNumber()
  net_amount?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  paid_amount?: number;

  @ApiPropertyOptional({ example: 'Delivered at godown 2' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePurchaseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplier_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplier_gstin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplier_phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  invoice_no?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  invoice_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payment_status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payment_mode?: string;

  @ApiPropertyOptional({ type: [PurchaseItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items?: PurchaseItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  subtotal?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  gst_amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  net_amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  paid_amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
