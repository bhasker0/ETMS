import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { TallyService } from './tally.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentCompanyId } from '../../common/decorators/current-company.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { FeatureToggleGuard } from '../../common/guards/feature-toggle.guard';
import { RequireFeature } from '../../common/decorators/feature.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { COMPANY_ID_HEADER } from '../../common/constants';

@ApiTags('Tally Prime XML Integration')
@ApiBearerAuth()
@ApiHeader({ name: COMPANY_ID_HEADER, description: 'Active Tenant UUID', required: true })
@UseGuards(JwtAuthGuard, TenantGuard, FeatureToggleGuard, PermissionsGuard)
@RequireFeature('tally_export')
@Controller('api/v1/tally')
export class TallyController {
  constructor(private tallyService: TallyService) {}

  @Get('export/invoices')
  @RequirePermissions(Permission.TALLY_EXPORT)
  @ApiOperation({ summary: 'Export Outward Job-Work Invoices to Tally Prime standard XML format' })
  @ApiQuery({ name: 'startDate', required: false, example: '2026-08-01' })
  @ApiQuery({ name: 'endDate', required: false, example: '2026-08-15' })
  @ApiQuery({ name: 'onlyUnsynced', required: false, type: Boolean })
  async exportInvoicesXml(
    @CurrentCompanyId() companyId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('onlyUnsynced') onlyUnsynced?: string,
    @Res() res?: Response,
  ) {
    const xmlContent = await this.tallyService.generateTallyXml(companyId, {
      startDate,
      endDate,
      onlyUnsynced: onlyUnsynced === 'true',
    });

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="tally-invoices.xml"');
    return res.status(HttpStatus.OK).send(xmlContent);
  }

  @Post('sync-status')
  @RequirePermissions(Permission.TALLY_EXPORT)
  @ApiOperation({ summary: 'Mark invoices as successfully imported and synced to Tally' })
  async updateSyncStatus(
    @CurrentCompanyId() companyId: string,
    @Body('invoiceIds') invoiceIds: string[],
  ) {
    return this.tallyService.markInvoicesAsSynced(companyId, invoiceIds || []);
  }
}
