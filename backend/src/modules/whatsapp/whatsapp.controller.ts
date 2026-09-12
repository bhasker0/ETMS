import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { WhatsappService } from './whatsapp.service';
import {
  SendWhatsappDocumentDto,
  SendInvoiceWhatsappDto,
  SendChallanWhatsappDto,
  SendPartyStatementWhatsappDto,
} from './dto/send-whatsapp.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentCompanyId } from '../../common/decorators/current-company.decorator';
import { COMPANY_ID_HEADER } from '../../common/constants';

@ApiTags('WhatsApp Document Sharing (OpenWA)')
@ApiBearerAuth()
@ApiHeader({ name: COMPANY_ID_HEADER, description: 'Active Tenant UUID', required: true })
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('api/v1/whatsapp')
export class WhatsappController {
  constructor(private whatsappService: WhatsappService) {}

  @Post('send-document')
  @ApiOperation({ summary: 'Send any PDF document directly to WhatsApp via OpenWA' })
  async sendDocument(
    @CurrentCompanyId() companyId: string,
    @Body() dto: SendWhatsappDocumentDto,
  ) {
    return this.whatsappService.sendDocument(companyId, dto);
  }

  @Post('invoices/:id/send')
  @ApiOperation({ summary: 'Generate and send Invoice PDF directly to recipient via WhatsApp' })
  async sendInvoicePdf(
    @CurrentCompanyId() companyId: string,
    @Param('id') id: string,
    @Body() dto: SendInvoiceWhatsappDto,
  ) {
    return this.whatsappService.sendInvoicePdf(companyId, id, dto.phone, dto.caption);
  }

  @Post('challans/:id/send')
  @ApiOperation({ summary: 'Generate and send Inward Delivery Challan PDF directly to party via WhatsApp' })
  async sendChallanPdf(
    @CurrentCompanyId() companyId: string,
    @Param('id') id: string,
    @Body() dto: SendChallanWhatsappDto,
  ) {
    return this.whatsappService.sendChallanPdf(companyId, id, dto.phone, dto.caption);
  }

  @Post('parties/:id/statement/send')
  @ApiOperation({ summary: 'Generate and send Party Ledger Statement PDF directly to party via WhatsApp' })
  async sendPartyStatementPdf(
    @CurrentCompanyId() companyId: string,
    @Param('id') id: string,
    @Body() dto: SendPartyStatementWhatsappDto,
  ) {
    return this.whatsappService.sendPartyStatementPdf(companyId, id, dto.phone, {
      startDate: dto.startDate,
      endDate: dto.endDate,
      caption: dto.caption,
    });
  }
}
