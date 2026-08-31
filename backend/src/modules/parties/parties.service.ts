import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Op } from 'sequelize';
import { Party } from '../../database/models/party.model';
import { InwardChallan } from '../../database/models/inward-challan.model';
import { OutwardInvoice } from '../../database/models/outward-invoice.model';
import { CreatePartyDto, UpdatePartyDto } from './dto/party.dto';

@Injectable()
export class PartiesService {
  async createParty(companyId: string, dto: CreatePartyDto) {
    const existing = await Party.findOne({
      where: {
        company_id: companyId,
        name: { [Op.iLike]: dto.name.trim() },
      },
    });

    if (existing) {
      throw new ConflictException(`Party '${dto.name}' already exists for this company`);
    }

    return Party.create({
      ...dto,
      name: dto.name.trim(),
      company_id: companyId,
    } as any);
  }

  async getParties(
    companyId: string,
    search?: string,
    isActive?: boolean,
    page?: number,
    limit?: number,
  ) {
    const whereClause: any = { company_id: companyId };

    if (isActive !== undefined) {
      whereClause.is_active = isActive;
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      whereClause[Op.or] = [
        { name: { [Op.iLike]: q } },
        { gstin: { [Op.iLike]: q } },
        { mobile: { [Op.iLike]: q } },
      ];
    }

    const queryOptions: any = {
      where: whereClause,
      order: [['name', 'ASC']],
    };

    if (page && limit) {
      queryOptions.limit = Number(limit);
      queryOptions.offset = (Number(page) - 1) * Number(limit);
    } else if (limit) {
      queryOptions.limit = Number(limit);
    }

    return Party.findAll(queryOptions);
  }

  async getPartyById(companyId: string, id: string) {
    const party = await Party.findOne({
      where: { id, company_id: companyId },
    });

    if (!party) {
      throw new NotFoundException(`Party '${id}' not found`);
    }

    // Build trader match conditions for transaction history
    const traderConditions: any[] = [{ trader_name: party.name }];
    if (party.gstin) {
      traderConditions.push({ trader_gstin: party.gstin });
    }

    const txWhere = {
      company_id: companyId,
      [Op.or]: traderConditions,
    };

    const [totalChallans, totalInvoices, totalBilledAmount, recentChallans, recentInvoices] =
      await Promise.all([
        InwardChallan.count({ where: txWhere }),
        OutwardInvoice.count({ where: txWhere }),
        OutwardInvoice.sum('net_amount', { where: txWhere }),
        InwardChallan.findAll({
          where: txWhere,
          limit: 5,
          order: [['challan_date', 'DESC']],
        }),
        OutwardInvoice.findAll({
          where: txWhere,
          limit: 5,
          order: [['invoice_date', 'DESC']],
        }),
      ]);

    return {
      ...party.toJSON(),
      transaction_summary: {
        total_challans: totalChallans,
        total_invoices: totalInvoices,
        total_billed_amount: Number(totalBilledAmount || 0),
        recent_challans: recentChallans,
        recent_invoices: recentInvoices,
      },
    };
  }

  async getPartyStatement(
    companyId: string,
    id: string,
    startDate?: string,
    endDate?: string,
  ) {
    const party = await Party.findOne({
      where: { id, company_id: companyId },
    });

    if (!party) {
      throw new NotFoundException(`Party '${id}' not found`);
    }

    const traderConditions: any[] = [{ trader_name: party.name }];
    if (party.gstin) {
      traderConditions.push({ trader_gstin: party.gstin });
    }

    const challanWhere: any = {
      company_id: companyId,
      [Op.or]: traderConditions,
    };
    const invoiceWhere: any = {
      company_id: companyId,
      [Op.or]: traderConditions,
    };

    if (startDate && endDate) {
      challanWhere.challan_date = { [Op.between]: [startDate, endDate] };
      invoiceWhere.invoice_date = { [Op.between]: [startDate, endDate] };
    } else if (startDate) {
      challanWhere.challan_date = { [Op.gte]: startDate };
      invoiceWhere.invoice_date = { [Op.gte]: startDate };
    } else if (endDate) {
      challanWhere.challan_date = { [Op.lte]: endDate };
      invoiceWhere.invoice_date = { [Op.lte]: endDate };
    }

    const [challans, invoices] = await Promise.all([
      InwardChallan.findAll({
        where: challanWhere,
        order: [['challan_date', 'ASC']],
      }),
      OutwardInvoice.findAll({
        where: invoiceWhere,
        order: [['invoice_date', 'ASC']],
      }),
    ]);

    const totalInwardMeters = challans.reduce((sum, c) => sum + Number(c.inward_meters || 0), 0);
    const totalInwardLots = challans.length;
    const totalOutwardMeters = invoices.reduce((sum, inv) => sum + Number(inv.outward_meters || 0), 0);
    const totalBilledAmount = invoices.reduce((sum, inv) => sum + Number(inv.net_amount || 0), 0);
    const openingBalance = Number(party.opening_balance || 0);

    // Combine into chronological ledger entries
    const rawEvents: Array<{
      id: string;
      date: string;
      type: 'INWARD_LOT' | 'OUTWARD_INVOICE';
      ref_no: string;
      particulars: string;
      quantity_info: string;
      amount: number;
    }> = [];

    for (const c of challans) {
      rawEvents.push({
        id: c.id,
        date: c.challan_date,
        type: 'INWARD_LOT',
        ref_no: c.lot_no || c.challan_no,
        particulars: `${c.fabric_quality || 'Fabric Lot'} • D#${c.design_no || 'N/A'}`,
        quantity_info: `${Number(c.inward_meters)}m (${c.than_count} Thans)`,
        amount: 0,
      });
    }

    for (const inv of invoices) {
      rawEvents.push({
        id: inv.id,
        date: inv.invoice_date,
        type: 'OUTWARD_INVOICE',
        ref_no: inv.invoice_no,
        particulars: `SAC 9988 Jobwork (GST ${(Number(inv.gst_rate || 0.05) * 100).toFixed(0)}%)`,
        quantity_info: `${Number(inv.outward_meters || inv.inward_meters || 0)}m • ${(Number(inv.total_stitches || 0) / 1000).toFixed(0)}k st`,
        amount: Number(inv.net_amount || 0),
      });
    }

    rawEvents.sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));

    let currentBalance = openingBalance;
    const timeline = rawEvents.map((ev) => {
      if (ev.type === 'OUTWARD_INVOICE') {
        currentBalance += ev.amount;
        return {
          id: ev.id,
          date: ev.date,
          type: ev.type,
          ref_no: ev.ref_no,
          particulars: ev.particulars,
          quantity_info: ev.quantity_info,
          debit: ev.amount,
          credit: 0,
          running_balance: currentBalance,
        };
      } else {
        return {
          id: ev.id,
          date: ev.date,
          type: ev.type,
          ref_no: ev.ref_no,
          particulars: ev.particulars,
          quantity_info: ev.quantity_info,
          debit: 0,
          credit: 0,
          running_balance: currentBalance,
        };
      }
    });

    // Payment aging computation based on invoice dates
    const now = new Date();
    let aging0to15 = 0;
    let aging16to30 = 0;
    let agingAbove30 = 0;

    for (const inv of invoices) {
      const invDate = new Date(inv.invoice_date);
      const diffDays = Math.floor((now.getTime() - invDate.getTime()) / (1000 * 3600 * 24));
      const amount = Number(inv.net_amount || 0);
      if (diffDays <= 15) {
        aging0to15 += amount;
      } else if (diffDays <= 30) {
        aging16to30 += amount;
      } else {
        agingAbove30 += amount;
      }
    }

    return {
      party: party.toJSON(),
      metrics: {
        opening_balance: openingBalance,
        total_billed_amount: totalBilledAmount,
        total_inward_meters: totalInwardMeters,
        total_inward_lots: totalInwardLots,
        total_outward_meters: totalOutwardMeters,
        total_invoices_count: invoices.length,
        closing_balance: currentBalance,
        fabric_in_process_meters: Math.max(0, totalInwardMeters - totalOutwardMeters),
        aging: {
          within_15_days: aging0to15,
          days_16_to_30: aging16to30,
          above_30_days: agingAbove30,
        },
      },
      timeline,
    };
  }

  async updateParty(companyId: string, id: string, dto: UpdatePartyDto) {
    const party = await Party.findOne({
      where: { id, company_id: companyId },
    });

    if (!party) {
      throw new NotFoundException(`Party '${id}' not found`);
    }

    if (dto.name && dto.name.trim().toLowerCase() !== party.name.toLowerCase()) {
      const duplicate = await Party.findOne({
        where: {
          company_id: companyId,
          name: { [Op.iLike]: dto.name.trim() },
          id: { [Op.ne]: id },
        },
      });

      if (duplicate) {
        throw new ConflictException(`Another party '${dto.name}' already exists for this company`);
      }
      dto.name = dto.name.trim();
    }

    await party.update(dto);
    return party;
  }

  async deleteParty(companyId: string, id: string) {
    const party = await Party.findOne({
      where: { id, company_id: companyId },
    });

    if (!party) {
      throw new NotFoundException(`Party '${id}' not found`);
    }

    await party.destroy();
    return { message: `Party '${party.name}' deactivated successfully` };
  }
}
