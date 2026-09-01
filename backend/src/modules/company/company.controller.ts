import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { CompanyService } from './company.service';
import { UpdateCompanyDto, AddCompanyMemberDto } from './dto/company.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentCompanyId } from '../../common/decorators/current-company.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Role } from '../../common/enums/role.enum';
import { Permission } from '../../common/enums/permission.enum';
import { COMPANY_ID_HEADER } from '../../common/constants';

@ApiTags('Company & Multi-Tenancy')
@ApiBearerAuth()
@ApiHeader({ name: COMPANY_ID_HEADER, description: 'Active Tenant UUID', required: true })
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('api/v1/company')
export class CompanyController {
  constructor(private companyService: CompanyService) {}

  @Get('current')
  @ApiOperation({ summary: 'Get details of the current tenant company' })
  async getCurrentCompany(@CurrentCompanyId() companyId: string) {
    return this.companyService.getCompanyById(companyId);
  }

  @Put('current')
  @Roles(Role.COMPANY_ADMIN, Role.SUPER_ADMIN)
  @RequirePermissions(Permission.COMPANY_SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Update current tenant company settings & tolerances' })
  async updateCurrentCompany(
    @CurrentCompanyId() companyId: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companyService.updateCompany(companyId, dto);
  }

  @Get('current/dashboard-layout')
  @ApiOperation({ summary: 'Get customized dashboard card order for current tenant company' })
  async getDashboardLayout(@CurrentCompanyId() companyId: string) {
    return this.companyService.getDashboardLayout(companyId);
  }

  @Put('current/dashboard-layout')
  @ApiOperation({ summary: 'Update dashboard card order for current tenant company' })
  async updateDashboardLayout(
    @CurrentCompanyId() companyId: string,
    @Body() body: { card_order: string[] },
  ) {
    return this.companyService.updateDashboardLayout(companyId, body?.card_order);
  }

  @Get('members')
  @ApiOperation({ summary: 'Get all members/staff associated with company' })
  async getMembers(@CurrentCompanyId() companyId: string) {
    return this.companyService.getMembers(companyId);
  }

  @Post('members')
  @Roles(Role.COMPANY_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Add a user with custom roles and permissions to company' })
  async addMember(
    @CurrentCompanyId() companyId: string,
    @Body() dto: AddCompanyMemberDto,
  ) {
    return this.companyService.addMember(companyId, dto);
  }

  @Delete('members/:id')
  @Roles(Role.COMPANY_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Deactivate member from company' })
  async removeMember(
    @CurrentCompanyId() companyId: string,
    @Param('id') memberId: string,
  ) {
    return this.companyService.removeMember(companyId, memberId);
  }
}
