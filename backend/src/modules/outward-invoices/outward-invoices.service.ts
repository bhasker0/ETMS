import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { SEQUELIZE_TOKEN } from '../../common/constants';
import { OutwardInvoice } from '../../database/models/outward-invoice.model';
import { InwardChallan } from '../../database/models/inward-challan.model';
import { Company } from '../../database/models/company.model';
import { Party } from '../../database/models/party.model';
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
  constructor(
    private pdfService: PdfService,
    @Inject(SEQUELIZE_TOKEN) private sequelize: Sequelize,
  ) {}

  public performCalculations(params: {
    total_stitches: number;
    rate_per_1000: number;
    machine_heads: number;
    inward_meters: number;
    outward_meters: number;
    trader_gstin?: string;
    company_gstin?: string;
    tolerance_percent?: number;
    overrideGrossAmount?: number;
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
      overrideGrossAmount,
    } = params;

    // 1. SAC 9988 Stitch Billing Formula: (Total Stitches / 1000) * Rate * Machine Heads OR override from items
    let gross_amount = 0;
    if (overrideGrossAmount !== undefined && overrideGrossAmount > 0) {
      gross_amount = Number(overrideGrossAmount.toFixed(2));
    } else {
      const stitchesInThousands = Number(total_stitches) / 1000;
      const rawGross = stitchesInThousands * Number(rate_per_1000) * Number(machine_heads);
      gross_amount = Number(rawGross.toFixed(2));
    }

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

    let challan = null;
    if (dto.inward_challan_id) {
      challan = await InwardChallan.findOne({
        where: { id: dto.inward_challan_id, company_id: companyId },
      });

      if (!challan) {
        throw new NotFoundException(`Inward Challan '${dto.inward_challan_id}' not found`);
      }

      const existingInvoice = await OutwardInvoice.findOne({
        where: { company_id: companyId, inward_challan_id: dto.inward_challan_id },
      });
      if (existingInvoice) {
        throw new BadRequestException(
          `Challan '${challan.lot_no}' is already invoiced under Invoice ${existingInvoice.invoice_no}`,
        );
      }
    }

    // Check if any lot_items are already invoiced
    if (dto.lot_items && Array.isArray(dto.lot_items)) {
      const lotChallanIds = dto.lot_items
        .map((it) => it.inward_challan_id)
        .filter(Boolean);
      if (lotChallanIds.length > 0) {
        const alreadyInvoiced = await OutwardInvoice.findAll({
          where: {
            company_id: companyId,
            inward_challan_id: { [Op.in]: lotChallanIds },
          },
          attributes: ['invoice_no', 'inward_challan_id'],
        });
        if (alreadyInvoiced.length > 0) {
          throw new BadRequestException(
            `One or more selected challans are already invoiced (e.g. Invoice ${alreadyInvoiced[0].invoice_no})`,
          );
        }
      }
    }

    const tolerance =
      company.settings?.shrinkage_tolerance_percent || DEFAULT_SHRINKAGE_TOLERANCE_PERCENT;

    const traderName = dto.trader_name || challan?.trader_name || 'Job Work Trader';
    const traderGstin = dto.trader_gstin || challan?.trader_gstin;

    // When multiple lot_items are provided, calculate aggregate stitches, gross amount, and meters from lot_items
    let itemsGross = 0;
    let itemsStitches = 0;
    let itemsMeters = 0;
    if (dto.lot_items && Array.isArray(dto.lot_items) && dto.lot_items.length > 0) {
      for (const it of dto.lot_items) {
        itemsGross += Number(it.taxable_amount || 0);
        itemsStitches += Number(it.stitch_count || 0);
        itemsMeters += Number(it.meters || 0);
      }
    }

    const totalStitches = itemsStitches > 0 ? itemsStitches : Number(dto.total_stitches || 24000);
    const inwardMeters = Number(challan?.inward_meters || (dto as any).inward_meters || itemsMeters || dto.outward_meters || 1000);
    const outwardMeters = Number(dto.outward_meters || itemsMeters || inwardMeters);

    const calc = this.performCalculations({
      total_stitches: totalStitches,
      rate_per_1000: Number(dto.rate_per_1000 || (dto.lot_items?.[0]?.rate) || 0.60),
      machine_heads: Number(dto.machine_heads || (dto.lot_items?.[0]?.machine_heads) || 32),
      inward_meters: inwardMeters,
      outward_meters: outwardMeters,
      trader_gstin: traderGstin,
      company_gstin: company.gstin,
      tolerance_percent: tolerance,
      overrideGrossAmount: itemsGross > 0 ? itemsGross : undefined,
    });

    let invoiceNo = dto.invoice_no;
    if (!invoiceNo) {
      const currentYear = new Date().getFullYear();
      const count = await OutwardInvoice.count({ where: { company_id: companyId } });
      invoiceNo = `INV-${currentYear}-${String(count + 1).padStart(4, '0')}`;
    }

    return await this.sequelize.transaction(async (t) => {
      const invoice = await OutwardInvoice.create(
        {
          company_id: companyId,
          inward_challan_id: challan?.id || dto.inward_challan_id || null,
          lot_items: dto.lot_items || null,
          invoice_no: invoiceNo,
          invoice_date: dto.invoice_date,
          trader_name: traderName,
          trader_gstin: traderGstin,
          sac_code: dto.sac_code || SAC_CODE_EMBROIDERY,
          machine_heads: Number(dto.machine_heads || (dto.lot_items?.[0]?.machine_heads) || 32),
          total_stitches: totalStitches,
          rate_per_1000: Number(dto.rate_per_1000 || (dto.lot_items?.[0]?.rate) || 0.60),
          gross_amount: calc.gross_amount,
          gst_rate: 0.05,
          cgst_amount: calc.cgst_amount,
          sgst_amount: calc.sgst_amount,
          igst_amount: calc.igst_amount,
          gst_5_percent: calc.gst_5_percent,
          net_amount: calc.net_amount,
          inward_meters: inwardMeters,
          outward_meters: outwardMeters,
          shrinkage_percent: calc.shrinkage_percent,
          is_shrinkage_exceeded: calc.is_shrinkage_exceeded,
          shrinkage_warning: calc.shrinkage_warning,
          tally_synced: false,
        } as any,
        { transaction: t },
      );

      // Update Inward Challan status
      if (challan) {
        await challan.update({ status: ChallanStatus.DISPATCHED }, { transaction: t });
      }

      if (dto.lot_items && Array.isArray(dto.lot_items)) {
        const lotChallanIds = dto.lot_items
          .map((it) => it.inward_challan_id)
          .filter(Boolean);
        if (lotChallanIds.length > 0) {
          await InwardChallan.update(
            { status: ChallanStatus.DISPATCHED },
            { where: { id: { [Op.in]: lotChallanIds }, company_id: companyId }, transaction: t },
          );
        }
      }

      return invoice;
    });
  }

  async getInvoices(
    companyId: string,
    options: {
      search?: string;
      startDate?: string;
      endDate?: string;
      tally_synced?: boolean;
      inward_challan_id?: string;
    } = {},
  ) {
    const where: any = { company_id: companyId };

    if (options.inward_challan_id) {
      where.inward_challan_id = options.inward_challan_id;
    }

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

    const invoices = await OutwardInvoice.findAll({
      where,
      include: [{ model: InwardChallan, as: 'inwardChallan' }],
      order: [['invoice_date', 'DESC'], ['created_at', 'DESC']],
    });

    const parties = await Party.findAll({ where: { company_id: companyId } });
    const partyMapByName = new Map<string, Party>();
    const partyMapByGstin = new Map<string, Party>();
    for (const p of parties) {
      if (p.name) partyMapByName.set(p.name.toLowerCase().trim(), p);
      if (p.gstin) partyMapByGstin.set(p.gstin.toUpperCase().trim(), p);
    }

    for (const inv of invoices) {
      const matchedParty =
        (inv.trader_name && partyMapByName.get(inv.trader_name.toLowerCase().trim())) ||
        (inv.trader_gstin && partyMapByGstin.get(inv.trader_gstin.toUpperCase().trim()));
      (inv as any).setDataValue('trader_mobile', matchedParty?.mobile || null);
      (inv as any).setDataValue('party', matchedParty ? matchedParty.toJSON() : null);
      (inv as any).setDataValue('lot_items', this.resolveInvoiceLotItems(inv));
    }

    return invoices;
  }

  public resolveInvoiceLotItems(invoice: OutwardInvoice): any[] {
    const rawItems = (invoice as any).lot_items;
    const isValidArray = Array.isArray(rawItems) && rawItems.length > 0;
    const hasValidItems =
      isValidArray &&
      rawItems.some(
        (it: any) =>
          it &&
          typeof it === 'object' &&
          !Array.isArray(it) &&
          (it.lot_no || it.design_no || (it.meters && Number(it.meters) > 0)),
      );

    if (hasValidItems) {
      return (rawItems as any[]).filter(
        (it) => it && typeof it === 'object' && !Array.isArray(it),
      );
    }

    const challan = invoice.inwardChallan;
    if (challan) {
      const chItems = (challan as any).items;
      if (
        Array.isArray(chItems) &&
        chItems.length > 0 &&
        chItems.some((ci: any) => ci && typeof ci === 'object' && !Array.isArray(ci) && ci.design_no)
      ) {
        return chItems
          .filter((ci: any) => ci && typeof ci === 'object' && !Array.isArray(ci))
          .map((ci: any) => {
            const st = Number(ci.stitch_count || challan.stitch_count || invoice.total_stitches || 24000);
            const hd = Number(invoice.machine_heads || 32);
            const rt = Number(ci.jobwork_price_per_1k || invoice.rate_per_1000 || 0.60);
            const taxable = Math.round((st * hd * rt) / 1000);
            return {
              inward_challan_id: challan.id,
              lot_no: challan.lot_no,
              design_no: ci.design_no || challan.design_no || 'Standard',
              fabric_quality: challan.fabric_quality || 'Embroidery Fabric',
              meters: Number(ci.meters || 0),
              thans: Number(ci.than_count || 1),
              stitch_count: st,
              machine_heads: hd,
              rate: rt,
              taxable_amount: taxable,
            };
          });
      }

      return [
        {
          inward_challan_id: challan.id,
          lot_no: challan.lot_no,
          design_no: challan.design_no || 'Standard Jobwork',
          fabric_quality: challan.fabric_quality || 'Embroidery Fabric',
          meters: Number(invoice.outward_meters || challan.inward_meters || 0),
          thans: Number(challan.than_count || 1),
          stitch_count: Number(invoice.total_stitches || challan.stitch_count || 24000),
          machine_heads: Number(invoice.machine_heads || 32),
          rate: Number(invoice.rate_per_1000 || 0.60),
          taxable_amount: Number(invoice.gross_amount || 0),
        },
      ];
    }

    return [];
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

    (invoice as any).setDataValue('trader_mobile', party?.mobile || null);
    (invoice as any).setDataValue('party', party ? party.toJSON() : null);
    (invoice as any).setDataValue('lot_items', this.resolveInvoiceLotItems(invoice));

    return invoice;
  }

  async generateInvoicePdfBuffer(companyId: string, id: string): Promise<Buffer> {
    const invoice = await this.getInvoiceById(companyId, id);
    const company = invoice.company || (await Company.findByPk(companyId));
    const challan = invoice.inwardChallan;
    const traderMobile = (invoice as any).get('trader_mobile') || (invoice as any).trader_mobile;
    const resolvedLotItems = (invoice as any).lot_items || this.resolveInvoiceLotItems(invoice);

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

    return this.pdfService.generateInvoicePdf({
      company: {
        name: company.name,
        gstin: company.gstin,
        address: company.address,
        phone: company.phone,
        bank_details: bankDetails,
        terms_and_conditions: termsAndConditions,
      },
      invoice: {
        invoice_no: invoice.invoice_no,
        invoice_date: invoice.invoice_date,
        trader_name: invoice.trader_name,
        trader_gstin: invoice.trader_gstin,
        trader_mobile: traderMobile,
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
      challan: {
        challan_no: challan?.challan_no || 'Direct Dispatch',
        lot_no: challan?.lot_no || (resolvedLotItems[0]?.lot_no || 'Direct Billed'),
        than_count: challan?.than_count || (resolvedLotItems.reduce((acc: number, it: any) => acc + (it.thans || 1), 0)),
        fabric_quality: challan?.fabric_quality || (resolvedLotItems[0]?.fabric_quality || 'Custom Job-Work'),
        design_no: challan?.design_no || (resolvedLotItems[0]?.design_no || 'Custom Design'),
      },
    });
  }

  async deleteInvoice(companyId: string, id: string) {
    const invoice = await this.getInvoiceById(companyId, id);
    await invoice.destroy();
    return { message: `Invoice ${invoice.invoice_no} deleted successfully` };
  }
}
