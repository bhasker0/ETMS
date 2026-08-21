import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MunimRequestStatus } from '../../../common/enums/munim-request-status.enum';
import { Permission } from '../../../common/enums/permission.enum';

export class MunimInviteCompanyDto {
  @ApiPropertyOptional({ example: '24AAAAA0000A1Z5', description: 'Company GSTIN' })
  @IsOptional()
  @IsString()
  gstin?: string;

  @ApiPropertyOptional({ example: '9825012345', description: 'Company Owner Mobile' })
  @IsOptional()
  @IsString()
  companyMobile?: string;

  @ApiPropertyOptional({ example: 'Requesting access for monthly GST and Fortnightly Karigar audit.' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ enum: Permission, isArray: true })
  @IsOptional()
  @IsArray()
  requestedPermissions?: Permission[];
}

export class CompanyInviteMunimDto {
  @ApiProperty({ example: '9825099999', description: 'Registered Mobile of Munim (Accountant)' })
  @IsString()
  @IsNotEmpty()
  munimMobile: string;

  @ApiPropertyOptional({ example: 'Inviting you to manage our Embroidery Job-Work books and Tally exports.' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ enum: Permission, isArray: true })
  @IsOptional()
  @IsArray()
  grantedPermissions?: Permission[];
}

export class RespondMunimRequestDto {
  @ApiProperty({
    enum: [MunimRequestStatus.ACCEPTED, MunimRequestStatus.REJECTED, MunimRequestStatus.REVOKED],
    example: MunimRequestStatus.ACCEPTED,
  })
  @IsEnum(MunimRequestStatus)
  status: MunimRequestStatus;

  @ApiPropertyOptional({ example: 'Accepted accountant access.' })
  @IsOptional()
  @IsString()
  notes?: string;
}
