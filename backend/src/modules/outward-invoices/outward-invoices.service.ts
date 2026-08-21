import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Op } from 'sequelize';
import { OutwardInvoice } from '../../database/models/outward-invoice.model';
import { InwardChallan } from '../../database/models/inward-challan.model';
import { Company } from '../../database/models/company.model';
import { PdfService } from '../pdf/pdf.service';
import { ChallanStatus } from '../../common/enums/challan-status.enum';
import {
  SAC_CODE_EMBROIDERY,
  DEFAULT_SHRINKAGE_TOLERANCE_PERCENT,
  GUJARAT_GSTIN_STATE_CODE,
} from '../../common/constants';
import {
  CreateOutwardInvoiceDto,
  CalculateInvoicePreviewDto,
} from './dto/outward-invoice.dto';

export interface CalculationResult {
  gross_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  gst_5_percent: number;
  net_amount: number;
  shrinkage_percent: number;
  is_shrinkage_exceeded: boolean;
  shrinkage_warning: string | null;
}

@Injectable()
export class OutwardInvoicesService {
  constructor(private pdfService: PdfService) {}

  public performCalculations(params: {
    total_stitches: number;
    rate_per_1000: number;
    machine_heads: number;
    inward_meters: number;
    outward_meters: number;
    trader_gstin?: string;
    company_gstin?: string;
    tolerance_percent?: number;
  }): CalculationResult {
    const {
      total_stitches,
      rate_per_1000,
      machine_heads,
      inward_meters,
      outward_meters,
      trader_gstin,
      company_gstin,
      tolerance_percent = DEFAULT_SHRINKAGE_TOLERANCE_PERCENT,
    } = params;

    // 1. SAC 9988 Stitch Billing Formula: (Total Stitches / 1000) * Rate * Machine Heads
    const stitchesInThousands = Number(total_stitches) / 1000;
    const rawGross = stitchesInThousands * Number(rate_per_1000) * Number(machine_heads);
    const gross_amount = Number(rawGross.toFixed(2));

    // 2. GST 5% Split (Intra-state vs Inter-state)
    const compState = (company_gstin || '').substring(0, 2) || GUJARAT_GSTIN_STATE_CODE;
    const traderState = (trader_gstin || '').substring(0, 2) || GUJARAT_GSTIN_STATE_CODE;

    const isIntraState = !trader_gstin || compState === traderState;

    let cgst_amount = 0;
    let sgst_amount = 0;
    let igst_amount = 0;

    if (isIntraState) {
      cgst_amount = Number((gross_amount * 0.025).toFixed(2));
      sgst_amount = Number((gross_amount * 0.025).toFixed(2));
    } else {
      igst_amount = Number((gross_amount * 0.05).toFixed(2));
    }

    const gst_5_percent = Number((cgst_amount + sgst_amount + igst_amount).toFixed(2));
    const net_amount = Number((gross_amount + gst_5_percent).toFixed(2));

    // 3. Shrinkage Reconciliation: ((Inward - Outward) / Inward) * 100
    let shrinkage_percent = 0;
    if (inward_meters > 0) {
      const rawShrinkage = ((inward_meters - outward_meters) / inward_meters) * 100;
      shrinkage_percent = Number(rawShrinkage.toFixed(2));
    }

    const is_shrinkage_exceeded = shrinkage_percent > tolerance_percent;
    const shrinkage_warning = is_shrinkage_exceeded
      ? `Shrinkage ${shrinkage_percent}% exceeds acceptable Surat fabric tolerance (${tolerance_percent}%)`
      : null;

    return {
      gross_amount,
      cgst_amount,
      sgst_amount,
      igst_amount,
      gst_5_percent,
      net_amount,
      shrinkage_percent,
      is_shrinkage_exceeded,
      shrinkage_warning,
    };
  }

  async calculatePreview(companyId: string, dto: CalculateInvoicePreviewDto) {
    const company = await Company.findByPk(companyId);
    const tolerance =
      company?.settings?.shrinkage_tolerance_percent || DEFAULT_SHRINKAGE_TOLERANCE_PERCENT;

    return this.performCalculations({
      total_stitches: dto.total_stitches,
      rate_per_1000: dto.rate_per_1000,
      machine_heads: dto.machine_heads,
      inward_meters: dto.inward_meters,
      outward_meters: dto.outward_meters,
      trader_gstin: dto.trader_gstin,
      company_gstin: company?.gstin,
      tolerance_percent: tolerance,
    });
  }

  async createInvoice(companyId: string, dto: CreateOutwardInvoiceDto) {
    const company = await Company.findByPk(companyId);
    if (!company) {
      throw new NotFoundException(`Company '${companyId}' not found`);
    }

    const challan = await InwardChallan.findOne({
      where: { id: dto.inward_challan_id, company_id: companyId },
    });

    if (!challan) {
      throw new NotFoundException(`Inward Challan '${dto.inward_challan_id}' not found`);
    }

    const tolerance =
      company.settings?.shrinkage_tolerance_percent || DEFAULT_SHRINKAGE_TOLERANCE_PERCENT;

    const calc = this.performCalculations({
      total_stitches: dto.total_stitches,
      rate_per_1000: dto.rate_per_1000,
      machine_heads: dto.machine_heads,
      inward_meters: Number(challan.inward_meters),
      outward_meters: Number(dto.outward_meters),
      trader_gstin: challan.trader_gstin,
      company_gstin: company.gstin,
      tolerance_percent: tolerance,
    });

    let invoiceNo = dto.invoice_no;
    if (!invoiceNo) {
      const currentYear = new Date().getFullYear();
      const count = await OutwardInvoice.count({ where: { company_id: companyId } });
      invoiceNo = `INV-${currentYear}-${String(count + 1).padStart(4, '0')}`;
    }

    const invoice = await OutwardInvoice.create({
      company_id: companyId,
      inward_challan_id: challan.id,
      invoice_no: invoiceNo,
      invoice_date: dto.invoice_date,
      trader_name: challan.trader_name,
      trader_gstin: challan.trader_gstin,
      sac_code: dto.sac_code || SAC_CODE_EMBROIDERY,
      machine_heads: dto.machine_heads,
      total_stitches: dto.total_stitches,
      rate_per_1000: dto.rate_per_1000,
      gross_amount: calc.gross_amount,
      gst_rate: 0.05,
      cgst_amount: calc.cgst_amount,
      sgst_amount: calc.sgst_amount,
      igst_amount: calc.igst_amount,
      gst_5_percent: calc.gst_5_percent,
      net_amount: calc.net_amount,
      inward_meters: Number(challan.inward_meters),
      outward_meters: Number(dto.outward_meters),
      shrinkage_percent: calc.shrinkage_percent,
      is_shrinkage_exceeded: calc.is_shrinkage_exceeded,
      shrinkage_warning: calc.shrinkage_warning,
      tally_synced: false,
    } as any);

    // Update Inward Challan status
    await challan.update({ status: ChallanStatus.DISPATCHED });

    return invoice;
  }

  async getInvoices(
    companyId: string,
    options: {
      search?: string;
      startDate?: string;
      endDate?: string;
      tally_synced?: boolean;
    } = {},
  ) {
    const where: any = { company_id: companyId };

    if (options.startDate && options.endDate) {
      where.invoice_date = { [Op.between]: [options.startDate, options.endDate] };
    }

    if (typeof options.tally_synced === 'boolean') {
      where.tally_synced = options.tally_synced;
    }

    if (options.search) {
      where[Op.or] = [
        { invoice_no: { [Op.iLike]: `%${options.search}%` } },
        { trader_name: { [Op.iLike]: `%${options.search}%` } },
        { trader_gstin: { [Op.iLike]: `%${options.search}%` } },
      ];
    }

    return OutwardInvoice.findAll({
      where,
      include: [{ model: InwardChallan, as: 'inwardChallan' }],
      order: [['invoice_date', 'DESC'], ['created_at', 'DESC']],
    });
  }

  async getInvoiceById(companyId: string, id: string) {
    const invoice = await OutwardInvoice.findOne({
      where: { id, company_id: companyId },
      include: [
        { model: InwardChallan, as: 'inwardChallan' },
        { model: Company, as: 'company' },
      ],
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice '${id}' not found`);
    }

    return invoice;
  }

  async generateInvoicePdfBuffer(companyId: string, id: string): Promise<Buffer> {
    const invoice = await this.getInvoiceById(companyId, id);
    const company = invoice.company || (await Company.findByPk(companyId));
    const challan = invoice.inwardChallan;

    return this.pdfService.generateInvoicePdf({
      company: {
        name: company.name,
        gstin: company.gstin,
        address: company.address,
        phone: company.phone,
      },
      invoice: {
        invoice_no: invoice.invoice_no,
        invoice_date: invoice.invoice_date,
        trader_name: invoice.trader_name,
        trader_gstin: invoice.trader_gstin,
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
      },
      challan: {
        challan_no: challan?.challan_no || 'N/A',
        lot_no: challan?.lot_no || 'N/A',
        than_count: challan?.than_count || 1,
        fabric_quality: challan?.fabric_quality || 'N/A',
        design_no: challan?.design_no || 'N/A',
      },
    });
  }

  async deleteInvoice(companyId: string, id: string) {
    const invoice = await this.getInvoiceById(companyId, id);
    await invoice.destroy();
    return { message: `Invoice ${invoice.invoice_no} deleted successfully` };
  }
}
