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
import { PartiesService } from './parties.service';
import { CreatePartyDto, UpdatePartyDto } from './dto/party.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentCompanyId } from '../../common/decorators/current-company.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Role } from '../../common/enums/role.enum';
import { Permission } from '../../common/enums/permission.enum';
import { COMPANY_ID_HEADER } from '../../common/constants';

@ApiTags('Parties (Trader Master)')
@ApiBearerAuth()
@ApiHeader({ name: COMPANY_ID_HEADER, description: 'Active Tenant UUID', required: true })
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('api/v1/parties')
export class PartiesController {
  constructor(private partiesService: PartiesService) {}

  @Post()
  @Roles(Role.COMPANY_ADMIN, Role.SUPERVISOR, Role.SUPER_ADMIN)
  @RequirePermissions(Permission.CHALLAN_CREATE, Permission.INVOICE_CREATE)
  @ApiOperation({ summary: 'Register a new Party / Trader' })
  async createParty(
    @CurrentCompanyId() companyId: string,
    @Body() dto: CreatePartyDto,
  ) {
    return this.partiesService.createParty(companyId, dto);
  }

  @Get()
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'is_active', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOperation({ summary: 'List all Parties for active company' })
  async getParties(
    @CurrentCompanyId() companyId: string,
    @Query('search') search?: string,
    @Query('is_active') isActive?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const activeBool =
      isActive !== undefined ? isActive === 'true' || isActive === '1' : undefined;
    return this.partiesService.getParties(companyId, search, activeBool, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get Party details by ID' })
  async getPartyById(
    @CurrentCompanyId() companyId: string,
    @Param('id') id: string,
  ) {
    return this.partiesService.getPartyById(companyId, id);
  }

  @Get(':id/statement')
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiOperation({ summary: 'Get Party Ledger Statement & Running Balance' })
  async getPartyStatement(
    @CurrentCompanyId() companyId: string,
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.partiesService.getPartyStatement(companyId, id, startDate, endDate);
  }

  @Put(':id')
  @Roles(Role.COMPANY_ADMIN, Role.SUPERVISOR, Role.SUPER_ADMIN)
  @RequirePermissions(Permission.CHALLAN_CREATE, Permission.INVOICE_CREATE)
  @ApiOperation({ summary: 'Update Party details' })
  async updateParty(
    @CurrentCompanyId() companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePartyDto,
  ) {
    return this.partiesService.updateParty(companyId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.COMPANY_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Deactivate / Delete Party' })
  async deleteParty(
    @CurrentCompanyId() companyId: string,
    @Param('id') id: string,
  ) {
    return this.partiesService.deleteParty(companyId, id);
  }
}
