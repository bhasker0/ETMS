import { Injectable, NotFoundException } from '@nestjs/common';
import { Op } from 'sequelize';
import { PurchaseInvoice } from '../../database/models/purchase-invoice.model';
import { CreatePurchaseDto, UpdatePurchaseDto } from './dto/create-purchase.dto';

@Injectable()
export class PurchasesService {
  async createPurchase(companyId: string, dto: CreatePurchaseDto) {
    // Calculate subtotal, gst_amount, and net_amount if not provided
    let subtotal = Number(dto.subtotal || 0);
    let gstAmount = Number(dto.gst_amount || 0);
    let netAmount = Number(dto.net_amount || 0);

    if (!subtotal && dto.items && dto.items.length > 0) {
      subtotal = dto.items.reduce((acc, item) => acc + (Number(item.taxable_amount) || 0), 0);
      gstAmount = dto.items.reduce((acc, item) => acc + (Number(item.gst_amount) || 0), 0);
      netAmount = subtotal + gstAmount;
    }

    return PurchaseInvoice.create({
      ...dto,
      company_id: companyId,
      subtotal,
      gst_amount: gstAmount,
      net_amount: netAmount || subtotal + gstAmount,
      paid_amount: Number(dto.paid_amount || 0),
    } as any);
  }

  async getPurchases(
    companyId: string,
    filters?: {
      startDate?: string;
      endDate?: string;
      search?: string;
      category?: string;
      paymentStatus?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const whereClause: any = { company_id: companyId };

    if (filters?.startDate && filters?.endDate) {
      whereClause.invoice_date = {
        [Op.between]: [filters.startDate, filters.endDate],
      };
    } else if (filters?.startDate) {
      whereClause.invoice_date = { [Op.gte]: filters.startDate };
    } else if (filters?.endDate) {
      whereClause.invoice_date = { [Op.lte]: filters.endDate };
    }

    if (filters?.category && filters.category !== 'ALL') {
      whereClause.category = filters.category;
    }

    if (filters?.paymentStatus && filters.paymentStatus !== 'ALL') {
      whereClause.payment_status = filters.paymentStatus;
    }

    if (filters?.search) {
      whereClause[Op.or] = [
        { supplier_name: { [Op.iLike]: `%${filters.search}%` } },
        { invoice_no: { [Op.iLike]: `%${filters.search}%` } },
        { supplier_gstin: { [Op.iLike]: `%${filters.search}%` } },
      ];
    }

    const page = Number(filters?.page || 1);
    const limit = Number(filters?.limit || 50);
    const offset = (page - 1) * limit;

    const { count, rows } = await PurchaseInvoice.findAndCountAll({
      where: whereClause,
      order: [['invoice_date', 'DESC'], ['created_at', 'DESC']],
      limit,
      offset,
    });

    return {
      purchases: rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
    };
  }

  async getPurchaseById(companyId: string, id: string) {
    const purchase = await PurchaseInvoice.findOne({
      where: { id, company_id: companyId },
    });
    if (!purchase) {
      throw new NotFoundException(`Purchase invoice ${id} not found`);
    }
    return purchase;
  }

  async updatePurchase(companyId: string, id: string, dto: UpdatePurchaseDto) {
    const purchase = await this.getPurchaseById(companyId, id);
    return purchase.update(dto as any);
  }

  async deletePurchase(companyId: string, id: string) {
    const purchase = await this.getPurchaseById(companyId, id);
    await purchase.destroy();
    return { success: true, message: `Purchase invoice ${id} deleted` };
  }

  async getPurchasesSummary(companyId: string, startDate?: string, endDate?: string) {
    const whereClause: any = { company_id: companyId };
    if (startDate && endDate) {
      whereClause.invoice_date = { [Op.between]: [startDate, endDate] };
    }

    const purchases = await PurchaseInvoice.findAll({
      where: whereClause,
      attributes: ['subtotal', 'gst_amount', 'net_amount', 'paid_amount', 'payment_status', 'category'],
    });

    let totalSubtotal = 0;
    let totalGst = 0;
    let totalNet = 0;
    let totalPaid = 0;
    const categoryTotals: Record<string, number> = {};

    for (const p of purchases) {
      const net = Number(p.net_amount || 0);
      totalSubtotal += Number(p.subtotal || 0);
      totalGst += Number(p.gst_amount || 0);
      totalNet += net;
      totalPaid += Number(p.paid_amount || 0);
      categoryTotals[p.category] = (categoryTotals[p.category] || 0) + net;
    }

    return {
      count: purchases.length,
      total_subtotal: totalSubtotal,
      total_gst: totalGst,
      total_net_amount: totalNet,
      total_paid: totalPaid,
      total_pending: totalNet - totalPaid,
      category_totals: categoryTotals,
    };
  }
}
