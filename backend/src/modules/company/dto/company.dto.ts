import { IsString, IsOptional, IsNumber, IsObject, IsArray, IsEnum, IsNotEmpty } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../common/enums/role.enum';
import { Permission } from '../../../common/enums/permission.enum';

export class UpdateCompanyDto {
  @ApiPropertyOptional({ example: 'Radhe Krishna Embroidery Works Pvt Ltd' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '24AAAAA0000A1Z5' })
  @IsOptional()
  @IsString()
  gstin?: string;

  @ApiPropertyOptional({ example: 'Plot 45, Khatodara GIDC, Surat - 395002' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '9825012345' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsNumber()
  default_shift_hours?: number;

  @ApiPropertyOptional({
    example: {
      shrinkage_tolerance_percent: 3.0,
      sac_code: '9988',
      default_rate_per_1000: 0.35,
      default_heads: 32,
    },
  })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}

export class AddCompanyMemberDto {
  @ApiProperty({ example: '9898011223', description: 'Registered mobile number of existing user' })
  @IsString()
  @IsNotEmpty()
  mobile: string;

  @ApiProperty({ enum: Role, example: Role.SUPERVISOR })
  @IsEnum(Role)
  role: Role;

  @ApiPropertyOptional({ enum: Permission, isArray: true })
  @IsOptional()
  @IsArray()
  permissions?: Permission[];
}
