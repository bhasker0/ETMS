import { Injectable } from '@nestjs/common';
import { Op } from 'sequelize';
import { DailyShiftLog } from '../../database/models/daily-shift-log.model';
import { Machine } from '../../database/models/machine.model';
import { Karigar } from '../../database/models/karigar.model';
import { OutwardInvoice } from '../../database/models/outward-invoice.model';
import { InwardChallan } from '../../database/models/inward-challan.model';
import { Expense } from '../../database/models/expense.model';
import { PurchaseInvoice } from '../../database/models/purchase-invoice.model';
import { KarigarUchapat } from '../../database/models/karigar-uchapat.model';

@Injectable()
export class ReportsService {
  /**
   * 1. Production & Shift Report
   */
  async getProductionReport(companyId: string, filters?: {
    startDate?: string;
    endDate?: string;
    machineId?: string;
    karigarId?: string;
    designNo?: string;
    shiftType?: string;
  }) {
    const whereClause: any = { company_id: companyId };

    if (filters?.startDate && filters?.endDate) {
      whereClause.shift_date = { [Op.between]: [filters.startDate, filters.endDate] };
    } else if (filters?.startDate) {
      whereClause.shift_date = { [Op.gte]: filters.startDate };
    } else if (filters?.endDate) {
      whereClause.shift_date = { [Op.lte]: filters.endDate };
    }

    if (filters?.machineId && filters.machineId !== 'ALL') {
      whereClause.machine_id = filters.machineId;
    }
    if (filters?.karigarId && filters.karigarId !== 'ALL') {
      whereClause.karigar_id = filters.karigarId;
    }
    if (filters?.designNo && filters.designNo !== 'ALL') {
      whereClause.design_no = { [Op.iLike]: `%${filters.designNo}%` };
    }
    if (filters?.shiftType && filters.shiftType !== 'ALL') {
      whereClause.shift_type = filters.shiftType;
    }

    const rows = await DailyShiftLog.findAll({
      where: whereClause,
      include: [
        { model: Machine, as: 'machine', attributes: ['id', 'machine_no', 'make_model', 'head_count'] },
        { model: Karigar, as: 'karigar', attributes: ['id', 'name', 'mobile', 'wage_type', 'default_rate_per_meter'] },
      ],
      order: [['shift_date', 'DESC'], ['created_at', 'DESC']],
    });

    let totalStitches = 0;
    let totalMeters = 0;
    let totalWages = 0;

    const data = rows.map((r) => {
      const stitches = Number(r.total_stitches || 0);
      const meters = Number(r.total_meters || 0);
      const rate = Number(r.karigar?.default_rate_per_meter || 0.18);
      const wages = meters * rate;
      totalStitches += stitches;
      totalMeters += meters;
      totalWages += wages;

      return {
        id: r.id,
        date: r.shift_date,
        shift: r.shift_type,
        machine_no: r.machine?.machine_no || 'N/A',
        karigar_name: r.karigar?.name || 'N/A',
        design_no: r.design_no || 'N/A',
        stitches,
        meters,
        start_counter: r.start_counter,
        end_counter: r.end_counter,
        rate_per_meter: rate,
        wages,
        downtime_minutes: r.downtime_minutes || 0,
        downtime_reason: r.downtime_reason || '',
      };
    });

    return {
      report: 'PRODUCTION_SHIFT_REPORT',
      filters,
      summary: {
        total_logs: data.length,
        total_stitches: totalStitches,
        total_meters: totalMeters,
        total_wages: totalWages,
      },
      data,
    };
  }

  /**
   * 2. Sales & Outward Invoices Report
   */
  async getSalesReport(companyId: string, filters?: {
    startDate?: string;
    endDate?: string;
    partyName?: string;
    designNo?: string;
  }) {
    const whereClause: any = { company_id: companyId };

    if (filters?.startDate && filters?.endDate) {
      whereClause.invoice_date = { [Op.between]: [filters.startDate, filters.endDate] };
    } else if (filters?.startDate) {
      whereClause.invoice_date = { [Op.gte]: filters.startDate };
    } else if (filters?.endDate) {
      whereClause.invoice_date = { [Op.lte]: filters.endDate };
    }

    if (filters?.partyName && filters.partyName !== 'ALL') {
      whereClause.trader_name = { [Op.iLike]: `%${filters.partyName}%` };
    }

    const rows = await OutwardInvoice.findAll({
      where: whereClause,
      order: [['invoice_date', 'DESC'], ['created_at', 'DESC']],
    });

    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalAmount = 0;
    let totalStitches = 0;
    let totalMeters = 0;

    const data = rows
      .filter((r) => {
        if (!filters?.designNo || filters.designNo === 'ALL') return true;
        const designSearch = filters.designNo.toLowerCase();
        const hasMatch = r.lot_items?.some((item) =>
          item.design_no?.toLowerCase().includes(designSearch),
        );
        return hasMatch;
      })
      .map((r) => {
        const taxable = Number(r.gross_amount || 0);
        const cgst = Number(r.cgst_amount || 0);
        const sgst = Number(r.sgst_amount || 0);
        const igst = Number(r.igst_amount || 0);
        const amt = Number(r.net_amount || 0);
        const stitches = Number(r.total_stitches || 0);
        const meters = Number(r.outward_meters || 0);

        totalTaxable += taxable;
        totalCgst += cgst;
        totalSgst += sgst;
        totalIgst += igst;
        totalAmount += amt;
        totalStitches += stitches;
        totalMeters += meters;

        const designNames = r.lot_items?.map((item) => item.design_no).filter(Boolean).join(', ') || 'Standard Jobwork';

        return {
          id: r.id,
          invoice_no: r.invoice_no,
          date: r.invoice_date,
          party_name: r.trader_name,
          party_gstin: r.trader_gstin || 'Unregistered',
          design_no: designNames,
          stitches,
          meters,
          rate: Number(r.rate_per_1000 || 0),
          taxable_amount: taxable,
          cgst,
          sgst,
          igst,
          total_amount: amt,
          payment_status: 'CONFIRMED',
          tally_synced: r.tally_synced ? 'YES' : 'NO',
        };
      });

    return {
      report: 'SALES_JOBWORK_REPORT',
      filters,
      summary: {
        total_invoices: data.length,
        total_stitches: totalStitches,
        total_meters: totalMeters,
        total_taxable_amount: totalTaxable,
        total_cgst: totalCgst,
        total_sgst: totalSgst,
        total_igst: totalIgst,
        grand_total: totalAmount,
      },
      data,
    };
  }

  /**
   * 3. Inward Challan / Lot Register Report
   */
  async getChallansReport(companyId: string, filters?: {
    startDate?: string;
    endDate?: string;
    partyName?: string;
    fabricQuality?: string;
    status?: string;
  }) {
    const whereClause: any = { company_id: companyId };

    if (filters?.startDate && filters?.endDate) {
      whereClause.challan_date = { [Op.between]: [filters.startDate, filters.endDate] };
    } else if (filters?.startDate) {
      whereClause.challan_date = { [Op.gte]: filters.startDate };
    } else if (filters?.endDate) {
      whereClause.challan_date = { [Op.lte]: filters.endDate };
    }

    if (filters?.partyName && filters.partyName !== 'ALL') {
      whereClause.trader_name = { [Op.iLike]: `%${filters.partyName}%` };
    }
    if (filters?.fabricQuality && filters.fabricQuality !== 'ALL') {
      whereClause.fabric_quality = { [Op.iLike]: `%${filters.fabricQuality}%` };
    }
    if (filters?.status && filters.status !== 'ALL') {
      whereClause.status = filters.status;
    }

    const rows = await InwardChallan.findAll({
      where: whereClause,
      order: [['challan_date', 'DESC'], ['created_at', 'DESC']],
    });

    let totalThans = 0;
    let totalMeters = 0;

    const data = rows.map((c) => {
      const thans = Number(c.than_count || 0);
      const meters = Number(c.inward_meters || 0);
      totalThans += thans;
      totalMeters += meters;

      return {
        id: c.id,
        challan_no: c.challan_no || `CH-${c.lot_no}`,
        lot_no: c.lot_no,
        date: c.challan_date,
        party_name: c.trader_name,
        party_gstin: c.trader_gstin || 'Unregistered',
        fabric_quality: c.fabric_quality,
        thans,
        meters,
        design_no: c.design_no || 'Standard',
        stitch_count: c.stitch_count || 0,
        rate: Number(c.jobwork_price_per_1k || 0),
        status: c.status,
      };
    });

    return {
      report: 'CHALLAN_LOT_REGISTER',
      filters,
      summary: {
        total_lots: data.length,
        total_thans: totalThans,
        total_meters: totalMeters,
      },
      data,
    };
  }

  /**
   * 4. Expenses Register Report
   */
  async getExpensesReport(companyId: string, filters?: {
    startDate?: string;
    endDate?: string;
    category?: string;
    expenseType?: string;
    paymentMode?: string;
  }) {
    const whereClause: any = { company_id: companyId };

    if (filters?.startDate && filters?.endDate) {
      whereClause.expense_date = { [Op.between]: [filters.startDate, filters.endDate] };
    } else if (filters?.startDate) {
      whereClause.expense_date = { [Op.gte]: filters.startDate };
    } else if (filters?.endDate) {
      whereClause.expense_date = { [Op.lte]: filters.endDate };
    }

    if (filters?.category && filters.category !== 'ALL') {
      whereClause.category = filters.category;
    }
    if (filters?.expenseType && filters.expenseType !== 'ALL') {
      whereClause.expense_type = filters.expenseType;
    }
    if (filters?.paymentMode && filters.paymentMode !== 'ALL') {
      whereClause.payment_mode = filters.paymentMode;
    }

    const rows = await Expense.findAll({
      where: whereClause,
      order: [['expense_date', 'DESC'], ['created_at', 'DESC']],
    });

    let totalDirect = 0;
    let totalIndirect = 0;
    let totalGst = 0;

    const expenseData = rows.map((e) => {
      const amt = Number(e.amount || 0);
      const gst = Number(e.gst_amount || 0);
      totalGst += gst;
      if (e.category === 'DIRECT') {
        totalDirect += amt;
      } else {
        totalIndirect += amt;
      }

      return {
        id: e.id,
        date: e.expense_date,
        category: e.category,
        type: e.expense_type,
        payee_name: e.payee_name,
        amount: amt,
        payment_mode: e.payment_mode,
        reference_no: e.reference_no || '',
        gst_amount: gst,
        description: e.description || '',
      };
    });

    // Also include Karigar Advances (Uchapat) as Indirect Expenses
    let uchapatData: any[] = [];
    const shouldIncludeUchapat =
      (!filters?.category || filters.category === 'ALL' || filters.category === 'INDIRECT') &&
      (!filters?.expenseType || filters.expenseType === 'ALL' || filters.expenseType === 'ADVANCE');

    if (shouldIncludeUchapat) {
      const uchapatWhere: any = { company_id: companyId };
      if (filters?.startDate && filters?.endDate) {
        uchapatWhere.date = { [Op.between]: [filters.startDate, filters.endDate] };
      } else if (filters?.startDate) {
        uchapatWhere.date = { [Op.gte]: filters.startDate };
      } else if (filters?.endDate) {
        uchapatWhere.date = { [Op.lte]: filters.endDate };
      }

      if (filters?.paymentMode && filters.paymentMode !== 'ALL') {
        uchapatWhere.payment_mode = filters.paymentMode;
      }

      const uchapats = await KarigarUchapat.findAll({
        where: uchapatWhere,
        include: [{ model: Karigar, as: 'karigar', attributes: ['name'] }],
        order: [['date', 'DESC'], ['created_at', 'DESC']],
      });

      uchapatData = uchapats.map((u: any) => {
        const amt = Number(u.amount || 0);
        totalIndirect += amt;
        return {
          id: `uchapat-${u.id}`,
          date: u.date,
          category: 'INDIRECT',
          type: 'ADVANCE',
          payee_name: u.karigar?.name ? `${u.karigar.name} (Karigar Advance)` : 'Karigar Advance',
          amount: amt,
          payment_mode: u.payment_mode || 'CASH',
          reference_no: u.is_settled ? 'UCHAPAT (SETTLED)' : 'UCHAPAT',
          gst_amount: 0,
          description: u.reason || `Advance / Uchapat given to ${u.karigar?.name || 'Karigar'}`,
        };
      });
    }

    const combinedData = [...expenseData, ...uchapatData].sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    return {
      report: 'EXPENSE_REGISTER_REPORT',
      filters,
      summary: {
        total_entries: combinedData.length,
        total_direct_expenses: totalDirect,
        total_indirect_expenses: totalIndirect,
        grand_total: totalDirect + totalIndirect,
        total_gst_input: totalGst,
      },
      data: combinedData,
    };
  }

  /**
   * 5. Purchases Register Report
   */
  async getPurchasesReport(companyId: string, filters?: {
    startDate?: string;
    endDate?: string;
    supplierName?: string;
    category?: string;
    paymentStatus?: string;
  }) {
    const whereClause: any = { company_id: companyId };

    if (filters?.startDate && filters?.endDate) {
      whereClause.invoice_date = { [Op.between]: [filters.startDate, filters.endDate] };
    } else if (filters?.startDate) {
      whereClause.invoice_date = { [Op.gte]: filters.startDate };
    } else if (filters?.endDate) {
      whereClause.invoice_date = { [Op.lte]: filters.endDate };
    }

    if (filters?.supplierName && filters.supplierName !== 'ALL') {
      whereClause.supplier_name = { [Op.iLike]: `%${filters.supplierName}%` };
    }
    if (filters?.category && filters.category !== 'ALL') {
      whereClause.category = filters.category;
    }
    if (filters?.paymentStatus && filters.paymentStatus !== 'ALL') {
      whereClause.payment_status = filters.paymentStatus;
    }

    const rows = await PurchaseInvoice.findAll({
      where: whereClause,
      order: [['invoice_date', 'DESC'], ['created_at', 'DESC']],
    });

    let totalSubtotal = 0;
    let totalGst = 0;
    let totalNet = 0;
    let totalPaid = 0;

    const data = rows.map((p) => {
      const subtotal = Number(p.subtotal || 0);
      const gst = Number(p.gst_amount || 0);
      const net = Number(p.net_amount || 0);
      const paid = Number(p.paid_amount || 0);

      totalSubtotal += subtotal;
      totalGst += gst;
      totalNet += net;
      totalPaid += paid;

      return {
        id: p.id,
        date: p.invoice_date,
        invoice_no: p.invoice_no,
        supplier_name: p.supplier_name,
        supplier_gstin: p.supplier_gstin || 'Unregistered',
        category: p.category,
        subtotal,
        gst_amount: gst,
        net_amount: net,
        paid_amount: paid,
        pending_amount: net - paid,
        payment_status: p.payment_status,
        payment_mode: p.payment_mode || 'BANK_TRANSFER',
        items_count: p.items?.length || 0,
        notes: p.notes || '',
      };
    });

    return {
      report: 'PURCHASE_REGISTER_REPORT',
      filters,
      summary: {
        total_invoices: data.length,
        total_subtotal: totalSubtotal,
        total_gst: totalGst,
        grand_total: totalNet,
        total_paid: totalPaid,
        total_pending: totalNet - totalPaid,
      },
      data,
    };
  }

  /**
   * 6. Factory P&L Profitability Summary
   */
  async getPnlReport(companyId: string, filters?: { startDate?: string; endDate?: string }) {
    const dateFilterSales: any = { company_id: companyId };
    const dateFilterExp: any = { company_id: companyId };
    const dateFilterPur: any = { company_id: companyId };
    const dateFilterWage: any = { company_id: companyId };

    if (filters?.startDate && filters?.endDate) {
      dateFilterSales.invoice_date = { [Op.between]: [filters.startDate, filters.endDate] };
      dateFilterExp.expense_date = { [Op.between]: [filters.startDate, filters.endDate] };
      dateFilterPur.invoice_date = { [Op.between]: [filters.startDate, filters.endDate] };
      dateFilterWage.shift_date = { [Op.between]: [filters.startDate, filters.endDate] };
    }

    // 1. Gross Revenue (Job-Work Outward Invoices)
    const invoices = await OutwardInvoice.findAll({
      where: dateFilterSales,
      attributes: ['gross_amount', 'net_amount'],
    });
    const totalJobworkRevenue = invoices.reduce((sum, i) => sum + Number(i.gross_amount || 0), 0);

    // 2. Karigar Wages (Direct Production Labor)
    const shiftLogs = await DailyShiftLog.findAll({
      where: dateFilterWage,
      include: [{ model: Karigar, as: 'karigar', attributes: ['default_rate_per_meter'] }],
    });
    const totalKarigarWages = shiftLogs.reduce((sum, s) => {
      const rate = Number(s.karigar?.default_rate_per_meter || 0.18);
      return sum + Number(s.total_meters || 0) * rate;
    }, 0);

    // 3. Raw Material & Spares Purchases
    const purchases = await PurchaseInvoice.findAll({
      where: dateFilterPur,
      attributes: ['subtotal', 'category'],
    });
    let yarnPurchases = 0;
    let sparesPurchases = 0;
    for (const p of purchases) {
      const amt = Number(p.subtotal || 0);
      if (p.category === 'YARN_DHAGA') yarnPurchases += amt;
      else sparesPurchases += amt;
    }

    // 4. Expenses (Direct vs Indirect)
    const expenses = await Expense.findAll({
      where: dateFilterExp,
      attributes: ['category', 'expense_type', 'amount'],
    });
    let directExpenses = 0;
    let indirectExpenses = 0;
    let powerElectricity = 0;
    let machineRepairs = 0;
    let factoryRent = 0;
    let staffSalaries = 0;

    for (const e of expenses) {
      const amt = Number(e.amount || 0);
      if (e.category === 'DIRECT') {
        directExpenses += amt;
        if (e.expense_type.includes('ELECTRICITY')) powerElectricity += amt;
        else if (e.expense_type.includes('REPAIR')) machineRepairs += amt;
      } else {
        indirectExpenses += amt;
        if (e.expense_type.includes('RENT')) factoryRent += amt;
        else if (e.expense_type.includes('SALARY')) staffSalaries += amt;
      }
    }

    // 5. Karigar Advances / Uchapat
    const dateFilterUchapat: any = { company_id: companyId };
    if (filters?.startDate && filters?.endDate) {
      dateFilterUchapat.date = { [Op.between]: [filters.startDate, filters.endDate] };
    }
    const uchapats = await KarigarUchapat.findAll({
      where: dateFilterUchapat,
      attributes: ['amount'],
    });
    const karigarAdvances = uchapats.reduce((sum, u) => sum + Number(u.amount || 0), 0);

    // Calculations
    const totalDirectCost = totalKarigarWages + yarnPurchases + sparesPurchases + directExpenses;
    const grossProfit = totalJobworkRevenue - totalDirectCost;
    const totalIndirectCost = indirectExpenses + karigarAdvances;
    const netProfit = grossProfit - totalIndirectCost;
    const profitMarginPercent = totalJobworkRevenue > 0 ? (netProfit / totalJobworkRevenue) * 100 : 0;

    return {
      report: 'FACTORY_PNL_STATEMENT',
      period: {
        startDate: filters?.startDate || 'All Time',
        endDate: filters?.endDate || 'All Time',
      },
      revenue: {
        jobwork_billing: totalJobworkRevenue,
        invoices_count: invoices.length,
      },
      direct_costs: {
        karigar_wages: totalKarigarWages,
        yarn_purchases: yarnPurchases,
        spare_parts_purchases: sparesPurchases,
        electricity_power: powerElectricity,
        machine_repairs: machineRepairs,
        other_direct_expenses: directExpenses - (powerElectricity + machineRepairs),
        total_direct_cost: totalDirectCost,
      },
      gross_profit: grossProfit,
      indirect_costs: {
        factory_rent: factoryRent,
        staff_salaries: staffSalaries,
        karigar_advances: karigarAdvances,
        other_indirect_expenses: indirectExpenses - (factoryRent + staffSalaries),
        total_indirect_cost: totalIndirectCost,
      },
      net_profit: netProfit,
      profit_margin_percent: Number(profitMarginPercent.toFixed(2)),
    };
  }
}
