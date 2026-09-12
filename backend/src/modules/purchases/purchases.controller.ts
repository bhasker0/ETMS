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
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto, UpdatePurchaseDto } from './dto/create-purchase.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentCompanyId } from '../../common/decorators/current-company.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { COMPANY_ID_HEADER } from '../../common/constants';

@ApiTags('Purchases (Raw Materials & Spares)')
@ApiBearerAuth()
@ApiHeader({ name: COMPANY_ID_HEADER, description: 'Active Tenant UUID', required: true })
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('api/v1/purchases')
export class PurchasesController {
  constructor(private purchasesService: PurchasesService) {}

  @Post()
  @Roles(Role.COMPANY_ADMIN, Role.SUPERVISOR, Role.MUNIM, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Record a new purchase invoice (yarn, needles, oil, spares)' })
  async createPurchase(
    @CurrentCompanyId() companyId: string,
    @Body() dto: CreatePurchaseDto,
  ) {
    return this.purchasesService.createPurchase(companyId, dto);
  }

  @Get('summary')
  @Roles(Role.COMPANY_ADMIN, Role.SUPERVISOR, Role.MUNIM, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get KPI totals and category summaries for purchases' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getPurchasesSummary(
    @CurrentCompanyId() companyId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.purchasesService.getPurchasesSummary(companyId, startDate, endDate);
  }

  @Get()
  @Roles(Role.COMPANY_ADMIN, Role.SUPERVISOR, Role.MUNIM, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'List and filter purchase invoices' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'paymentStatus', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getPurchases(
    @CurrentCompanyId() companyId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.purchasesService.getPurchases(companyId, {
      startDate,
      endDate,
      search,
      category,
      paymentStatus,
      page,
      limit,
    });
  }

  @Get(':id')
  @Roles(Role.COMPANY_ADMIN, Role.SUPERVISOR, Role.MUNIM, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get purchase invoice details by ID' })
  async getPurchaseById(
    @CurrentCompanyId() companyId: string,
    @Param('id') id: string,
  ) {
    return this.purchasesService.getPurchaseById(companyId, id);
  }

  @Put(':id')
  @Roles(Role.COMPANY_ADMIN, Role.SUPERVISOR, Role.MUNIM, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update purchase invoice' })
  async updatePurchase(
    @CurrentCompanyId() companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseDto,
  ) {
    return this.purchasesService.updatePurchase(companyId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.COMPANY_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete purchase invoice' })
  async deletePurchase(
    @CurrentCompanyId() companyId: string,
    @Param('id') id: string,
  ) {
    return this.purchasesService.deletePurchase(companyId, id);
  }
}
