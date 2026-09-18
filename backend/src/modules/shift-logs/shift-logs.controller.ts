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
import { ShiftLogsService } from './shift-logs.service';
import { CreateShiftLogDto, UpdateShiftLogDto } from './dto/shift-log.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentCompanyId } from '../../common/decorators/current-company.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { FeatureToggleGuard } from '../../common/guards/feature-toggle.guard';
import { RequireFeature } from '../../common/decorators/feature.decorator';
import { Role } from '../../common/enums/role.enum';
import { Permission } from '../../common/enums/permission.enum';
import { COMPANY_ID_HEADER } from '../../common/constants';

@ApiTags('Daily Shift Logs & Downtime')
@ApiBearerAuth()
@ApiHeader({ name: COMPANY_ID_HEADER, description: 'Active Tenant UUID', required: true })
@UseGuards(JwtAuthGuard, TenantGuard, FeatureToggleGuard, PermissionsGuard)
@RequireFeature('shift_production')
@Controller('api/v1/shift-logs')
export class ShiftLogsController {
  constructor(private shiftLogsService: ShiftLogsService) {}

  @Post()
  @Roles(Role.COMPANY_ADMIN, Role.SUPERVISOR, Role.KARIGAR_OPERATOR, Role.SUPER_ADMIN)
  @RequirePermissions(Permission.SHIFT_LOG)
  @ApiOperation({ summary: 'Log a shift counter reading & meters produced' })
  async createShiftLog(
    @CurrentCompanyId() companyId: string,
    @Body() dto: CreateShiftLogDto,
  ) {
    return this.shiftLogsService.createShiftLog(companyId, dto);
  }

  @Get()
  @RequirePermissions(Permission.SHIFT_LOG_READ)
  @ApiOperation({ summary: 'List Shift Logs with filters' })
  @ApiQuery({ name: 'machine_id', required: false })
  @ApiQuery({ name: 'karigar_id', required: false })
  @ApiQuery({ name: 'inward_challan_id', required: false })
  @ApiQuery({ name: 'shift_type', required: false })
  @ApiQuery({ name: 'startDate', required: false, example: '2026-08-01' })
  @ApiQuery({ name: 'endDate', required: false, example: '2026-08-15' })
  async getShiftLogs(
    @CurrentCompanyId() companyId: string,
    @Query('machine_id') machineId?: string,
    @Query('karigar_id') karigarId?: string,
    @Query('inward_challan_id') inwardChallanId?: string,
    @Query('shift_type') shiftType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.shiftLogsService.getShiftLogs(companyId, {
      machine_id: machineId,
      karigar_id: karigarId,
      inward_challan_id: inwardChallanId,
      shift_type: shiftType,
      startDate,
      endDate,
    });
  }

  @Get('downtime-analytics')
  @RequirePermissions(Permission.SHIFT_LOG_READ)
  @ApiOperation({ summary: 'Get machine downtime breakdown and statistics' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getDowntimeStats(
    @CurrentCompanyId() companyId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.shiftLogsService.getDowntimeStats(companyId, startDate, endDate);
  }

  @Get(':id')
  @RequirePermissions(Permission.SHIFT_LOG_READ)
  @ApiOperation({ summary: 'Get Shift Log details by ID' })
  async getShiftLogById(
    @CurrentCompanyId() companyId: string,
    @Param('id') id: string,
  ) {
    return this.shiftLogsService.getShiftLogById(companyId, id);
  }

  @Put(':id')
  @Roles(Role.COMPANY_ADMIN, Role.SUPERVISOR, Role.SUPER_ADMIN)
  @RequirePermissions(Permission.SHIFT_LOG)
  @ApiOperation({ summary: 'Update Shift Log counters' })
  async updateShiftLog(
    @CurrentCompanyId() companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateShiftLogDto,
  ) {
    return this.shiftLogsService.updateShiftLog(companyId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.COMPANY_ADMIN, Role.SUPER_ADMIN)
  @RequirePermissions(Permission.SHIFT_LOG)
  @ApiOperation({ summary: 'Delete Shift Log' })
  async deleteShiftLog(
    @CurrentCompanyId() companyId: string,
    @Param('id') id: string,
  ) {
    return this.shiftLogsService.deleteShiftLog(companyId, id);
  }
}
