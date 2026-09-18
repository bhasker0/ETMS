import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { KarigarsService } from './karigars.service';
import { CreateKarigarDto, UpdateKarigarDto } from './dto/karigar.dto';
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

@ApiTags('Karigars (Operators Master)')
@ApiBearerAuth()
@ApiHeader({ name: COMPANY_ID_HEADER, description: 'Active Tenant UUID', required: true })
@UseGuards(JwtAuthGuard, TenantGuard, FeatureToggleGuard, PermissionsGuard)
@RequireFeature('karigars')
@Controller('api/v1/karigars')
export class KarigarsController {
  constructor(private karigarsService: KarigarsService) {}

  @Post()
  @Roles(Role.COMPANY_ADMIN, Role.SUPERVISOR, Role.SUPER_ADMIN)
  @RequirePermissions(Permission.KARIGAR_MANAGE)
  @ApiOperation({ summary: 'Register a new Karigar' })
  async createKarigar(
    @CurrentCompanyId() companyId: string,
    @Body() dto: CreateKarigarDto,
  ) {
    return this.karigarsService.createKarigar(companyId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all Karigars' })
  async getKarigars(@CurrentCompanyId() companyId: string) {
    return this.karigarsService.getKarigars(companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get Karigar details by ID' })
  async getKarigarById(
    @CurrentCompanyId() companyId: string,
    @Param('id') id: string,
  ) {
    return this.karigarsService.getKarigarById(companyId, id);
  }

  @Put(':id')
  @Roles(Role.COMPANY_ADMIN, Role.SUPERVISOR, Role.SUPER_ADMIN)
  @RequirePermissions(Permission.KARIGAR_MANAGE)
  @ApiOperation({ summary: 'Update Karigar profile & wage rate' })
  async updateKarigar(
    @CurrentCompanyId() companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateKarigarDto,
  ) {
    return this.karigarsService.updateKarigar(companyId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.COMPANY_ADMIN, Role.SUPER_ADMIN)
  @RequirePermissions(Permission.KARIGAR_MANAGE)
  @ApiOperation({ summary: 'Delete/Deactivate Karigar' })
  async deleteKarigar(
    @CurrentCompanyId() companyId: string,
    @Param('id') id: string,
  ) {
    return this.karigarsService.deleteKarigar(companyId, id);
  }
}
