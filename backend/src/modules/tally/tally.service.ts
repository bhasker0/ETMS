import { Injectable, NotFoundException } from '@nestjs/common';
import { Op } from 'sequelize';
import { OutwardInvoice } from '../../database/models/outward-invoice.model';
import { InwardChallan } from '../../database/models/inward-challan.model';
import { Company } from '../../database/models/company.model';
import { buildTallyPrimeXml, TallyVoucherInput } from './tally-xml.builder';

@Injectable()
export class TallyService {
  async generateTallyXml(
    companyId: string,
    options: {
      invoiceIds?: string[];
      startDate?: string;
      endDate?: string;
      onlyUnsynced?: boolean;
    } = {},
  ): Promise<string> {
    const company = await Company.findByPk(companyId);
    if (!company) {
      throw new NotFoundException(`Company '${companyId}' not found`);
    }

    const where: any = { company_id: companyId };

    if (options.invoiceIds && options.invoiceIds.length > 0) {
      where.id = { [Op.in]: options.invoiceIds };
    }

    if (options.startDate && options.endDate) {
      where.invoice_date = { [Op.between]: [options.startDate, options.endDate] };
    }

    if (options.onlyUnsynced) {
      where.tally_synced = false;
    }

    const invoices = await OutwardInvoice.findAll({
      where,
      include: [{ model: InwardChallan, as: 'inwardChallan' }],
      order: [['invoice_date', 'ASC']],
    });

    const voucherInputs: TallyVoucherInput[] = invoices.map((inv) => ({
      guid: inv.tally_guid || `ETMS-INV-${inv.id}`,
      invoice_no: inv.invoice_no,
      invoice_date: inv.invoice_date,
      trader_name: inv.trader_name,
      trader_gstin: inv.trader_gstin,
      sac_code: inv.sac_code || '9988',
      machine_heads: inv.machine_heads || 32,
      total_stitches: Number(inv.total_stitches),
      rate_per_1000: Number(inv.rate_per_1000),
      gross_amount: Number(inv.gross_amount),
      cgst_amount: Number(inv.cgst_amount),
      sgst_amount: Number(inv.sgst_amount),
      igst_amount: Number(inv.igst_amount),
      net_amount: Number(inv.net_amount),
      inward_meters: Number(inv.inward_meters),
      outward_meters: Number(inv.outward_meters),
      challan_no: inv.inwardChallan?.challan_no,
      lot_no: inv.inwardChallan?.lot_no,
    }));

    return buildTallyPrimeXml(company.name, voucherInputs);
  }

  async markInvoicesAsSynced(companyId: string, invoiceIds: string[]) {
    await OutwardInvoice.update(
      {
        tally_synced: true,
        tally_sync_time: new Date(),
      },
      {
        where: {
          id: { [Op.in]: invoiceIds },
          company_id: companyId,
        },
      },
    );

    return { message: `${invoiceIds.length} invoices marked as Tally Synced` };
  }
}
