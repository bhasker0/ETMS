import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentCompanyId } from '../../common/decorators/current-company.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { FeatureToggleGuard } from '../../common/guards/feature-toggle.guard';
import { RequireFeature } from '../../common/decorators/feature.decorator';
import { Role } from '../../common/enums/role.enum';
import { COMPANY_ID_HEADER } from '../../common/constants';

@ApiTags('Reports (Production, Sales, Expenses, P&L)')
@ApiBearerAuth()
@ApiHeader({ name: COMPANY_ID_HEADER, description: 'Active Tenant UUID', required: true })
@UseGuards(JwtAuthGuard, TenantGuard, FeatureToggleGuard, PermissionsGuard)
@RequireFeature('reports')
@Controller('api/v1/reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('production')
  @Roles(Role.COMPANY_ADMIN, Role.SUPERVISOR, Role.MUNIM, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get Production & Shift performance report' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'machineId', required: false, type: String })
  @ApiQuery({ name: 'karigarId', required: false, type: String })
  @ApiQuery({ name: 'designNo', required: false, type: String })
  @ApiQuery({ name: 'shiftType', required: false, type: String })
  async getProductionReport(
    @CurrentCompanyId() companyId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('machineId') machineId?: string,
    @Query('karigarId') karigarId?: string,
    @Query('designNo') designNo?: string,
    @Query('shiftType') shiftType?: string,
  ) {
    return this.reportsService.getProductionReport(companyId, {
      startDate,
      endDate,
      machineId,
      karigarId,
      designNo,
      shiftType,
    });
  }

  @Get('sales')
  @Roles(Role.COMPANY_ADMIN, Role.SUPERVISOR, Role.MUNIM, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get Sales & Job-Work Outward Invoices report' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'partyName', required: false, type: String })
  @ApiQuery({ name: 'designNo', required: false, type: String })
  async getSalesReport(
    @CurrentCompanyId() companyId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('partyName') partyName?: string,
    @Query('designNo') designNo?: string,
  ) {
    return this.reportsService.getSalesReport(companyId, {
      startDate,
      endDate,
      partyName,
      designNo,
    });
  }

  @Get('challans')
  @Roles(Role.COMPANY_ADMIN, Role.SUPERVISOR, Role.MUNIM, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get Inward Lots & Challan Register report' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'partyName', required: false, type: String })
  @ApiQuery({ name: 'fabricQuality', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  async getChallansReport(
    @CurrentCompanyId() companyId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('partyName') partyName?: string,
    @Query('fabricQuality') fabricQuality?: string,
    @Query('status') status?: string,
  ) {
    return this.reportsService.getChallansReport(companyId, {
      startDate,
      endDate,
      partyName,
      fabricQuality,
      status,
    });
  }

  @Get('expenses')
  @Roles(Role.COMPANY_ADMIN, Role.SUPERVISOR, Role.MUNIM, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get Direct vs Indirect Expenses Register report' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'expenseType', required: false, type: String })
  @ApiQuery({ name: 'paymentMode', required: false, type: String })
  async getExpensesReport(
    @CurrentCompanyId() companyId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('category') category?: string,
    @Query('expenseType') expenseType?: string,
    @Query('paymentMode') paymentMode?: string,
  ) {
    return this.reportsService.getExpensesReport(companyId, {
      startDate,
      endDate,
      category,
      expenseType,
      paymentMode,
    });
  }

  @Get('purchases')
  @Roles(Role.COMPANY_ADMIN, Role.SUPERVISOR, Role.MUNIM, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get Purchases (Raw Materials & Spares) report' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'supplierName', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'paymentStatus', required: false, type: String })
  async getPurchasesReport(
    @CurrentCompanyId() companyId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('supplierName') supplierName?: string,
    @Query('category') category?: string,
    @Query('paymentStatus') paymentStatus?: string,
  ) {
    return this.reportsService.getPurchasesReport(companyId, {
      startDate,
      endDate,
      supplierName,
      category,
      paymentStatus,
    });
  }

  @Get('pnl')
  @Roles(Role.COMPANY_ADMIN, Role.SUPERVISOR, Role.MUNIM, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get Factory Profit & Loss (P&L) Statement' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getPnlReport(
    @CurrentCompanyId() companyId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getPnlReport(companyId, { startDate, endDate });
  }
}
