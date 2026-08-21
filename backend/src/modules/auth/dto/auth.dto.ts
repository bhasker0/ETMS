import { IsString, IsNotEmpty, MinLength, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: '9825012345', description: 'Registered mobile number' })
  @IsString()
  @IsNotEmpty()
  mobile: string;

  @ApiProperty({ example: 'Surat@2026', description: 'Password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ description: 'Optional company ID to switch active context on login' })
  @IsOptional()
  @IsString()
  companyId?: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'Bhavesh Patel', description: 'User full name' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: '9825012345', description: '10-digit mobile number' })
  @IsString()
  @IsNotEmpty()
  mobile: string;

  @ApiPropertyOptional({ example: 'bhavesh@suratembroidery.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'Surat@2026', minLength: 6 })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: 'Radhe Krishna Embroidery Works' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ example: '24AAAAA0000A1Z5' })
  @IsOptional()
  @IsString()
  gstin?: string;

  @ApiPropertyOptional({ example: 'COMPANY_ADMIN', enum: ['COMPANY_ADMIN', 'MUNIM', 'SUPERVISOR', 'KARIGAR_OPERATOR'] })
  @IsOptional()
  @IsString()
  role?: string;
}

export class SwitchCompanyDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @IsString()
  @IsNotEmpty()
  companyId: string;
}
