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
import { InwardChallansService } from './inward-challans.service';
import { CreateInwardChallanDto, UpdateInwardChallanDto } from './dto/inward-challan.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentCompanyId } from '../../common/decorators/current-company.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Role } from '../../common/enums/role.enum';
import { Permission } from '../../common/enums/permission.enum';
import { COMPANY_ID_HEADER } from '../../common/constants';

@ApiTags('Inward Delivery Challans (Raw Fabric Lots)')
@ApiBearerAuth()
@ApiHeader({ name: COMPANY_ID_HEADER, description: 'Active Tenant UUID', required: true })
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('api/v1/inward-challans')
export class InwardChallansController {
  constructor(private inwardChallansService: InwardChallansService) {}

  @Post()
  @Roles(Role.COMPANY_ADMIN, Role.SUPERVISOR, Role.SUPER_ADMIN)
  @RequirePermissions(Permission.CHALLAN_CREATE)
  @ApiOperation({ summary: 'Create a new Inward Delivery Challan from Trader' })
  async createChallan(
    @CurrentCompanyId() companyId: string,
    @Body() dto: CreateInwardChallanDto,
  ) {
    return this.inwardChallansService.createChallan(companyId, dto);
  }

  @Get()
  @RequirePermissions(Permission.CHALLAN_READ)
  @ApiOperation({ summary: 'List Inward Challans with optional filters' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getChallans(
    @CurrentCompanyId() companyId: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.inwardChallansService.getChallans(companyId, {
      status,
      search,
      startDate,
      endDate,
    });
  }

  @Get(':id')
  @RequirePermissions(Permission.CHALLAN_READ)
  @ApiOperation({ summary: 'Get Inward Challan details with related shifts and invoices' })
  async getChallanById(
    @CurrentCompanyId() companyId: string,
    @Param('id') id: string,
  ) {
    return this.inwardChallansService.getChallanById(companyId, id);
  }

  @Put(':id')
  @Roles(Role.COMPANY_ADMIN, Role.SUPERVISOR, Role.SUPER_ADMIN)
  @RequirePermissions(Permission.CHALLAN_UPDATE)
  @ApiOperation({ summary: 'Update Inward Challan status or details' })
  async updateChallan(
    @CurrentCompanyId() companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateInwardChallanDto,
  ) {
    return this.inwardChallansService.updateChallan(companyId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.COMPANY_ADMIN, Role.SUPER_ADMIN)
  @RequirePermissions(Permission.CHALLAN_UPDATE)
  @ApiOperation({ summary: 'Delete Inward Challan' })
  async deleteChallan(
    @CurrentCompanyId() companyId: string,
    @Param('id') id: string,
  ) {
    return this.inwardChallansService.deleteChallan(companyId, id);
  }
}
