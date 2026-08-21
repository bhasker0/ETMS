import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { OutwardInvoicesService } from './outward-invoices.service';
import { CreateOutwardInvoiceDto, CalculateInvoicePreviewDto } from './dto/outward-invoice.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentCompanyId } from '../../common/decorators/current-company.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Role } from '../../common/enums/role.enum';
import { Permission } from '../../common/enums/permission.enum';
import { COMPANY_ID_HEADER } from '../../common/constants';

@ApiTags('Outward Invoices & SAC 9988 Stitch Billing')
@ApiBearerAuth()
@ApiHeader({ name: COMPANY_ID_HEADER, description: 'Active Tenant UUID', required: true })
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('api/v1/outward-invoices')
export class OutwardInvoicesController {
  constructor(private outwardInvoicesService: OutwardInvoicesService) {}

  @Post('calculate')
  @RequirePermissions(Permission.INVOICE_CREATE)
  @ApiOperation({ summary: 'Pre-flight calculation: SAC 9988 formula, 5% GST split & shrinkage tolerance check' })
  async calculatePreview(
    @CurrentCompanyId() companyId: string,
    @Body() dto: CalculateInvoicePreviewDto,
  ) {
    return this.outwardInvoicesService.calculatePreview(companyId, dto);
  }

  @Post()
  @Roles(Role.COMPANY_ADMIN, Role.SUPERVISOR, Role.SUPER_ADMIN)
  @RequirePermissions(Permission.INVOICE_CREATE)
  @ApiOperation({ summary: 'Generate and save a new GST Job-Work Tax Invoice' })
  async createInvoice(
    @CurrentCompanyId() companyId: string,
    @Body() dto: CreateOutwardInvoiceDto,
  ) {
    return this.outwardInvoicesService.createInvoice(companyId, dto);
  }

  @Get()
  @RequirePermissions(Permission.INVOICE_READ)
  @ApiOperation({ summary: 'List Outward Invoices with optional filters' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'startDate', required: false, example: '2026-08-01' })
  @ApiQuery({ name: 'endDate', required: false, example: '2026-08-15' })
  @ApiQuery({ name: 'tally_synced', required: false, type: Boolean })
  async getInvoices(
    @CurrentCompanyId() companyId: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('tally_synced') tallySynced?: string,
  ) {
    return this.outwardInvoicesService.getInvoices(companyId, {
      search,
      startDate,
      endDate,
      tally_synced: tallySynced !== undefined ? tallySynced === 'true' : undefined,
    });
  }

  @Get(':id')
  @RequirePermissions(Permission.INVOICE_READ)
  @ApiOperation({ summary: 'Get Outward Invoice details by ID' })
  async getInvoiceById(
    @CurrentCompanyId() companyId: string,
    @Param('id') id: string,
  ) {
    return this.outwardInvoicesService.getInvoiceById(companyId, id);
  }

  @Get(':id/pdf')
  @RequirePermissions(Permission.INVOICE_READ)
  @ApiOperation({ summary: 'Download generated PDF Invoice / Delivery Challan via Puppeteer microservice' })
  async downloadInvoicePdf(
    @CurrentCompanyId() companyId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.outwardInvoicesService.generateInvoicePdfBuffer(companyId, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="invoice-${id}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.status(HttpStatus.OK).send(pdfBuffer);
  }

  @Delete(':id')
  @Roles(Role.COMPANY_ADMIN, Role.SUPER_ADMIN)
  @RequirePermissions(Permission.INVOICE_DELETE)
  @ApiOperation({ summary: 'Delete Outward Invoice' })
  async deleteInvoice(
    @CurrentCompanyId() companyId: string,
    @Param('id') id: string,
  ) {
    return this.outwardInvoicesService.deleteInvoice(companyId, id);
  }
}
