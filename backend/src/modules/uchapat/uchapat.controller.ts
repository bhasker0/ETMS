import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { UchapatService } from './uchapat.service';
import { CreateUchapatDto, UpdateUchapatDto } from './dto/uchapat.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentCompanyId } from '../../common/decorators/current-company.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Role } from '../../common/enums/role.enum';
import { Permission } from '../../common/enums/permission.enum';
import { COMPANY_ID_HEADER } from '../../common/constants';

@ApiTags('Karigar Uchapat (Cash/UPI Advances)')
@ApiBearerAuth()
@ApiHeader({ name: COMPANY_ID_HEADER, description: 'Active Tenant UUID', required: true })
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('api/v1/uchapat')
export class UchapatController {
  constructor(private uchapatService: UchapatService) {}

  @Post()
  @Roles(Role.COMPANY_ADMIN, Role.SUPERVISOR, Role.SUPER_ADMIN)
  @RequirePermissions(Permission.UCHAPAT_MANAGE)
  @ApiOperation({ summary: 'Record a Karigar Uchapat (Cash/UPI advance)' })
  async createUchapat(
    @CurrentCompanyId() companyId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateUchapatDto,
  ) {
    return this.uchapatService.createUchapat(companyId, userId, dto);
  }

  @Get()
  @RequirePermissions(Permission.UCHAPAT_READ)
  @ApiOperation({ summary: 'List Uchapat advances with optional filters' })
  @ApiQuery({ name: 'karigar_id', required: false })
  @ApiQuery({ name: 'startDate', required: false, example: '2026-08-01' })
  @ApiQuery({ name: 'endDate', required: false, example: '2026-08-15' })
  @ApiQuery({ name: 'is_settled', required: false, type: Boolean })
  async getUchapats(
    @CurrentCompanyId() companyId: string,
    @Query('karigar_id') karigarId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('is_settled') isSettled?: string,
  ) {
    return this.uchapatService.getUchapats(companyId, {
      karigar_id: karigarId,
      startDate,
      endDate,
      is_settled: isSettled !== undefined ? isSettled === 'true' : undefined,
    });
  }

  @Get('summary/karigar/:karigarId')
  @RequirePermissions(Permission.UCHAPAT_READ)
  @ApiOperation({ summary: 'Get total and unsettled Uchapat summary for a Karigar' })
  async getKarigarUchapatSummary(
    @CurrentCompanyId() companyId: string,
    @Param('karigarId') karigarId: string,
  ) {
    return this.uchapatService.getKarigarUchapatSummary(companyId, karigarId);
  }

  @Put(':id')
  @Roles(Role.COMPANY_ADMIN, Role.SUPERVISOR, Role.SUPER_ADMIN)
  @RequirePermissions(Permission.UCHAPAT_MANAGE)
  @ApiOperation({ summary: 'Update an unsettled Uchapat record' })
  async updateUchapat(
    @CurrentCompanyId() companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUchapatDto,
  ) {
    return this.uchapatService.updateUchapat(companyId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.COMPANY_ADMIN, Role.SUPER_ADMIN)
  @RequirePermissions(Permission.UCHAPAT_MANAGE)
  @ApiOperation({ summary: 'Delete an unsettled Uchapat advance record' })
  async deleteUchapat(
    @CurrentCompanyId() companyId: string,
    @Param('id') id: string,
  ) {
    return this.uchapatService.deleteUchapat(companyId, id);
  }
}
