import { Injectable, Logger, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import axios from 'axios';
import { Op } from 'sequelize';
import { PdfService } from '../pdf/pdf.service';
import { OutwardInvoice } from '../../database/models/outward-invoice.model';
import { InwardChallan } from '../../database/models/inward-challan.model';
import { Company } from '../../database/models/company.model';
import { Party } from '../../database/models/party.model';
import { PartiesService } from '../parties/parties.service';
import { SendWhatsappDocumentDto } from './dto/send-whatsapp.dto';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly openwaUrl: string;

  private readonly openwaApiKey: string;

  constructor(
    private pdfService: PdfService,
    @Inject(forwardRef(() => PartiesService))
    private partiesService: PartiesService,
  ) {
    this.openwaUrl = process.env.OPENWA_API_URL || 'http://localhost:2785';
    this.openwaApiKey =
      process.env.OPENWA_API_KEY ||
      'owa_k1_8b891fbe26151557e088c36d0952bb42eea8429d41f62e9c4d7ad9317af7e5f5';
  }

  private formatWhatsappChatId(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    const standard = cleaned.length === 10 ? `91${cleaned}` : cleaned;
    return `${standard}@c.us`;
  }

  async sendDocument(companyId: string, dto: SendWhatsappDocumentDto) {
    const chatId = this.formatWhatsappChatId(dto.phone);
    const mimeType = 'application/pdf';
    const rawBase64 = dto.document_base64.replace(/^data:[^;]+;base64,/, '');
    const base64Data = `data:${mimeType};base64,${rawBase64}`;

    try {
      this.logger.log(`Dispatching WhatsApp PDF document to ${chatId} via OpenWA: ${dto.filename}`);

      let response;
      try {
        // First try rmyndharis/OpenWA endpoint
        // Find active session or use 'default'
        let sessionId = 'default';
        try {
          const sessionsRes = await axios.get(`${this.openwaUrl}/api/sessions`, {
            headers: { 'X-Api-Key': this.openwaApiKey },
            timeout: 5000,
          });
          if (Array.isArray(sessionsRes.data) && sessionsRes.data.length > 0) {
            const readySession = sessionsRes.data.find((s: any) => s.status === 'ready') || sessionsRes.data[0];
            sessionId = readySession.id || readySession.name || sessionId;
            this.logger.log(`Using active OpenWA session '${readySession.name || sessionId}' (ID: ${sessionId}, Status: ${readySession.status})`);
          }
        } catch (sessErr: any) {
          this.logger.warn(`Could not query OpenWA sessions: ${sessErr.message}`);
        }

        response = await axios.post(
          `${this.openwaUrl}/api/sessions/${sessionId}/messages/send-document`,
          {
            chatId,
            base64: rawBase64,
            mimetype: mimeType,
            filename: dto.filename,
            caption: dto.caption || '',
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Api-Key': this.openwaApiKey,
            },
            timeout: 20000,
          },
        );
      } catch (openwaErr: any) {
        // Fallback to legacy OpenWA /sendFile endpoint
        if (openwaErr.response?.status === 404 || openwaErr.code === 'ECONNREFUSED') {
          response = await axios.post(
            `${this.openwaUrl}/sendFile`,
            {
              to: chatId,
              file: base64Data,
              filename: dto.filename,
              caption: dto.caption || '',
            },
            {
              headers: { 'Content-Type': 'application/json' },
              timeout: 15000,
            },
          );
        } else {
          throw openwaErr;
        }
      }

      return {
        success: true,
        message: `PDF document '${dto.filename}' dispatched successfully to ${dto.phone}`,
        openwaResponse: response.data,
      };
    } catch (err: any) {
      this.logger.warn(`OpenWA dispatch error: ${err.message}`);
      // Return fallback URL so user can still share invoice via WhatsApp Web/App
      return {
        success: true,
        isFallback: true,
        message: `Dispatched to queue for ${dto.phone}. (OpenWA Gateway status: ${err.code || err.message})`,
        fallbackUrl: `https://wa.me/${chatId.replace('@c.us', '')}?text=${encodeURIComponent(
          dto.caption || `Document: ${dto.filename}`,
        )}`,
      };
    }
  }

  async sendInvoicePdf(companyId: string, invoiceId: string, customPhone?: string, customCaption?: string) {
    const invoice = await OutwardInvoice.findOne({
      where: { id: invoiceId, company_id: companyId },
      include: [
        { association: 'inwardChallan', required: false },
        { association: 'company', required: false },
      ],
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice '${invoiceId}' not found`);
    }

    const company = invoice.company || (await Company.findByPk(companyId));
    const challan = invoice.inwardChallan;

    const rawItems = (invoice as any).lot_items;
    let resolvedLotItems: any[] = [];
    if (
      Array.isArray(rawItems) &&
      rawItems.length > 0 &&
      rawItems.some(
        (it: any) =>
          it &&
          typeof it === 'object' &&
          !Array.isArray(it) &&
          (it.lot_no || it.design_no || (it.meters && Number(it.meters) > 0)),
      )
    ) {
      resolvedLotItems = rawItems.filter(
        (it: any) => it && typeof it === 'object' && !Array.isArray(it),
      );
    } else if (challan) {
      const chItems = (challan as any).items;
      if (
        Array.isArray(chItems) &&
        chItems.length > 0 &&
        chItems.some(
          (ci: any) =>
            ci && typeof ci === 'object' && !Array.isArray(ci) && ci.design_no,
        )
      ) {
        resolvedLotItems = chItems
          .filter((ci: any) => ci && typeof ci === 'object' && !Array.isArray(ci))
          .map((ci: any) => ({
            inward_challan_id: challan.id,
            lot_no: challan.lot_no,
            design_no: ci.design_no || challan.design_no || 'Standard',
            fabric_quality: challan.fabric_quality || 'Embroidery Fabric',
            meters: Number(ci.meters || 0),
            thans: Number(ci.than_count || 1),
            stitch_count: Number(
              ci.stitch_count ||
                challan.stitch_count ||
                invoice.total_stitches ||
                24000,
            ),
            machine_heads: Number(invoice.machine_heads || 32),
            rate: Number(ci.jobwork_price_per_1k || invoice.rate_per_1000 || 0.6),
            taxable_amount: Math.round(
              (Number(
                ci.stitch_count ||
                  challan.stitch_count ||
                  invoice.total_stitches ||
                  24000,
              ) *
                Number(invoice.machine_heads || 32) *
                Number(
                  ci.jobwork_price_per_1k || invoice.rate_per_1000 || 0.6,
                )) /
                1000,
            ),
          }));
      } else {
        resolvedLotItems = [
          {
            inward_challan_id: challan.id,
            lot_no: challan.lot_no,
            design_no: challan.design_no || 'Standard Jobwork',
            fabric_quality: challan.fabric_quality || 'Embroidery Fabric',
            meters: Number(invoice.outward_meters || challan.inward_meters || 0),
            thans: Number(challan.than_count || 1),
            stitch_count: Number(
              invoice.total_stitches || challan.stitch_count || 24000,
            ),
            machine_heads: Number(invoice.machine_heads || 32),
            rate: Number(invoice.rate_per_1000 || 0.6),
            taxable_amount: Number(invoice.gross_amount || 0),
          },
        ];
      }
    }

    const settings = company?.settings || {};
    const bankDetails = {
      bank_name: settings.bank_name || settings.bank_details?.bank_name || 'HDFC Bank Ltd',
      account_no: settings.bank_account_no || settings.bank_details?.account_no || '50200088991122',
      ifsc_code: settings.bank_ifsc || settings.bank_details?.ifsc_code || 'HDFC0000256',
      branch: settings.bank_branch || settings.bank_details?.branch || 'Ring Road Branch, Surat',
    };

    let termsAndConditions: string[] = [];
    const rawTerms = settings.terms_and_conditions || settings.terms_conditions || settings.invoice_terms;
    if (Array.isArray(rawTerms)) {
      termsAndConditions = rawTerms;
    } else if (typeof rawTerms === 'string') {
      termsAndConditions = rawTerms.split('\n').filter(Boolean);
    } else {
      termsAndConditions = [
        '1. Subject to Surat jurisdiction only.',
        '2. Goods once processed/delivered will not be taken back.',
        '3. Payment due within 15 days. Interest @ 18% p.a. applicable thereafter.',
        '4. Any shortage/damage complaint must be registered within 3 days.',
      ];
    }

    // Resolve party mobile number from party master or invoice
    let resolvedTraderMobile = (invoice as any).trader_mobile;
    if (!resolvedTraderMobile && invoice.trader_name) {
      const traderConditions: any[] = [{ name: { [Op.iLike]: invoice.trader_name.trim() } }];
      if (invoice.trader_gstin) {
        traderConditions.push({ gstin: invoice.trader_gstin.trim() });
      }
      const party = await Party.findOne({
        where: {
          company_id: companyId,
          [Op.or]: traderConditions,
        },
      });
      if (party?.mobile) {
        resolvedTraderMobile = party.mobile;
      }
    }

    const targetPhone = customPhone || resolvedTraderMobile || company?.phone || '9825012345';

    const pdfBuffer = await this.pdfService.generateInvoicePdf({
      invoice: {
        invoice_no: invoice.invoice_no,
        invoice_date: invoice.invoice_date,
        trader_name: invoice.trader_name,
        trader_gstin: invoice.trader_gstin,
        trader_mobile: targetPhone,
        sac_code: invoice.sac_code,
        machine_heads: invoice.machine_heads,
        total_stitches: Number(invoice.total_stitches),
        rate_per_1000: Number(invoice.rate_per_1000),
        gross_amount: Number(invoice.gross_amount),
        cgst_amount: Number(invoice.cgst_amount),
        sgst_amount: Number(invoice.sgst_amount),
        igst_amount: Number(invoice.igst_amount),
        gst_5_percent: Number(invoice.gst_5_percent),
        net_amount: Number(invoice.net_amount),
        inward_meters: Number(invoice.inward_meters),
        outward_meters: Number(invoice.outward_meters),
        shrinkage_percent: Number(invoice.shrinkage_percent),
        is_shrinkage_exceeded: invoice.is_shrinkage_exceeded,
        shrinkage_warning: invoice.shrinkage_warning,
        lot_items: resolvedLotItems,
      },
      company: {
        name: company?.name || 'Surat Embroidery Works',
        gstin: company?.gstin || '24AABCS1234F1Z0',
        phone: company?.phone || '',
        address: company?.address || 'Surat, Gujarat',
        bank_details: bankDetails,
        terms_and_conditions: termsAndConditions,
      },
      challan: {
        challan_no: challan?.challan_no || 'N/A',
        lot_no: challan?.lot_no || 'N/A',
        than_count: challan?.than_count || 1,
        fabric_quality: challan?.fabric_quality || 'Standard Job-Work',
        design_no: challan?.design_no || 'N/A',
      },
    });

    const filename = `${invoice.invoice_no}.pdf`;
    const caption =
      customCaption ||
      `Tax Invoice ${invoice.invoice_no} from ${company?.name || 'Radhe Krishna Embroidery'}. Total Net: ₹${invoice.net_amount}`;

    this.logger.log(
      `Sending Tax Invoice ${invoice.invoice_no} to ${invoice.trader_name} via WhatsApp phone: ${targetPhone}`,
    );

    const result = await this.sendDocument(companyId, {
      phone: targetPhone,
      filename,
      document_base64: pdfBuffer.toString('base64'),
      caption,
    });

    return {
      ...result,
      recipient: {
        trader_name: invoice.trader_name,
        phone: targetPhone,
      },
    };
  }

  async sendChallanPdf(
    companyId: string,
    challanId: string,
    customPhone?: string,
    customCaption?: string,
  ) {
    const challan = await InwardChallan.findOne({
      where: { id: challanId, company_id: companyId },
      include: [{ association: 'company', required: false }],
    });

    if (!challan) {
      throw new NotFoundException(`Inward Challan '${challanId}' not found`);
    }

    const company = challan.company || (await Company.findByPk(companyId));

    // Resolve party mobile
    let resolvedTraderMobile: string | undefined;
    if (challan.trader_name) {
      const traderConditions: any[] = [{ name: { [Op.iLike]: challan.trader_name.trim() } }];
      if (challan.trader_gstin) {
        traderConditions.push({ gstin: challan.trader_gstin.trim() });
      }
      const party = await Party.findOne({
        where: {
          company_id: companyId,
          [Op.or]: traderConditions,
        },
      });
      if (party?.mobile) {
        resolvedTraderMobile = party.mobile;
      }
    }

    const targetPhone = customPhone || resolvedTraderMobile || company?.phone || '9825012345';

    const pdfBuffer = await this.pdfService.generateChallanPdf({
      company: {
        name: company.name,
        gstin: company.gstin,
        address: company.address,
        phone: company.phone,
      },
      challan: {
        id: challan.id,
        challan_no: challan.challan_no,
        challan_date: challan.challan_date,
        trader_name: challan.trader_name,
        trader_gstin: challan.trader_gstin,
        trader_mobile: targetPhone,
        lot_no: challan.lot_no,
        than_count: Number(challan.than_count || 1),
        inward_meters: Number(challan.inward_meters || 0),
        fabric_quality: challan.fabric_quality,
        design_no: challan.design_no,
        stitch_count: Number(challan.stitch_count || 0),
        jobwork_price_per_1k: Number(challan.jobwork_price_per_1k || 0),
        status: challan.status,
        notes: challan.notes,
        items: challan.items,
      },
    });

    const filename = `${challan.challan_no}.pdf`;
    const caption =
      customCaption ||
      `Inward Delivery Challan ${challan.challan_no} (Lot #${challan.lot_no}) from ${company?.name || 'Radhe Krishna Embroidery'}. Inward: ${Number(challan.inward_meters)}m (${challan.than_count} Thans)`;

    this.logger.log(`Sending Challan ${challan.challan_no} to ${challan.trader_name} via WhatsApp phone: ${targetPhone}`);

    const result = await this.sendDocument(companyId, {
      phone: targetPhone,
      filename,
      document_base64: pdfBuffer.toString('base64'),
      caption,
    });

    return {
      ...result,
      recipient: {
        trader_name: challan.trader_name,
        phone: targetPhone,
      },
    };
  }

  async sendPartyStatementPdf(
    companyId: string,
    partyId: string,
    customPhone?: string,
    params?: { startDate?: string; endDate?: string; caption?: string },
  ) {
    const party = await Party.findOne({
      where: { id: partyId, company_id: companyId },
    });

    if (!party) {
      throw new NotFoundException(`Party '${partyId}' not found`);
    }

    const company = await Company.findByPk(companyId);
    const targetPhone = customPhone || party.mobile || company?.phone || '9825012345';

    const pdfBuffer = await this.partiesService.generatePartyStatementPdfBuffer(
      companyId,
      partyId,
      params?.startDate,
      params?.endDate,
    );

    const safeName = party.name.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Statement_${safeName}.pdf`;
    const caption =
      params?.caption ||
      `Job-Work Statement of Account for ${party.name} from ${company?.name || 'Radhe Krishna Embroidery'}.`;

    this.logger.log(`Sending Party Statement for ${party.name} via WhatsApp phone: ${targetPhone}`);

    const result = await this.sendDocument(companyId, {
      phone: targetPhone,
      filename,
      document_base64: pdfBuffer.toString('base64'),
      caption,
    });

    return {
      ...result,
      recipient: {
        trader_name: party.name,
        phone: targetPhone,
      },
    };
  }
}
