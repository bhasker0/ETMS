import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { MachinesService } from './machines.service';
import { CreateMachineDto, UpdateMachineDto } from './dto/machine.dto';
import { TelemetryIngestDto } from './dto/telemetry.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentCompanyId } from '../../common/decorators/current-company.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { FeatureToggleGuard } from '../../common/guards/feature-toggle.guard';
import { RequireFeature } from '../../common/decorators/feature.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Role } from '../../common/enums/role.enum';
import { Permission } from '../../common/enums/permission.enum';
import { COMPANY_ID_HEADER } from '../../common/constants';

@ApiTags('Machines (24/32/44/66 Heads)')
@ApiBearerAuth()
@ApiHeader({ name: COMPANY_ID_HEADER, description: 'Active Tenant UUID', required: true })
@UseGuards(JwtAuthGuard, TenantGuard, FeatureToggleGuard, PermissionsGuard)
@RequireFeature('machines')
@Controller('api/v1/machines')
export class MachinesController {
  constructor(private machinesService: MachinesService) {}

  @Public()
  @Post('telemetry')
  @ApiOperation({ summary: 'Ingest live CAN bus telemetry from ESP32 edge device' })
  async ingestTelemetry(
    @Body() dto: TelemetryIngestDto,
    @Headers('x-api-key') apiKeyHeader?: string,
    @Headers('authorization') authHeader?: string,
  ) {
    const extractedHeaderKey = apiKeyHeader || (authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined);
    return this.machinesService.ingestTelemetry(dto, extractedHeaderKey);
  }

  @Post()
  @Roles(Role.COMPANY_ADMIN, Role.SUPERVISOR, Role.SUPER_ADMIN)
  @RequirePermissions(Permission.MACHINE_MANAGE)
  @ApiOperation({ summary: 'Register a new embroidery machine' })
  async createMachine(
    @CurrentCompanyId() companyId: string,
    @Body() dto: CreateMachineDto,
  ) {
    return this.machinesService.createMachine(companyId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all machines for the company' })
  async getMachines(@CurrentCompanyId() companyId: string) {
    return this.machinesService.getMachines(companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get machine details by ID' })
  async getMachineById(
    @CurrentCompanyId() companyId: string,
    @Param('id') id: string,
  ) {
    return this.machinesService.getMachineById(companyId, id);
  }

  @Put(':id')
  @Roles(Role.COMPANY_ADMIN, Role.SUPERVISOR, Role.SUPER_ADMIN)
  @RequirePermissions(Permission.MACHINE_MANAGE)
  @ApiOperation({ summary: 'Update machine configuration' })
  async updateMachine(
    @CurrentCompanyId() companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMachineDto,
  ) {
    return this.machinesService.updateMachine(companyId, id, dto);
  }

  @Post(':id/regenerate-key')
  @Roles(Role.COMPANY_ADMIN, Role.SUPER_ADMIN)
  @RequirePermissions(Permission.MACHINE_MANAGE)
  @ApiOperation({ summary: 'Regenerate IoT telemetry API key for a machine' })
  async regenerateApiKey(
    @CurrentCompanyId() companyId: string,
    @Param('id') id: string,
  ) {
    return this.machinesService.regenerateApiKey(companyId, id);
  }

  @Delete(':id')
  @Roles(Role.COMPANY_ADMIN, Role.SUPER_ADMIN)
  @RequirePermissions(Permission.MACHINE_MANAGE)
  @ApiOperation({ summary: 'Delete/Decommission a machine' })
  async deleteMachine(
    @CurrentCompanyId() companyId: string,
    @Param('id') id: string,
  ) {
    return this.machinesService.deleteMachine(companyId, id);
  }
}

