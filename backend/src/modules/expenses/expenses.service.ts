import { Injectable, NotFoundException } from '@nestjs/common';
import { Op } from 'sequelize';
import { Expense } from '../../database/models/expense.model';
import { KarigarUchapat } from '../../database/models/karigar-uchapat.model';
import { Karigar } from '../../database/models/karigar.model';
import { CreateExpenseDto, UpdateExpenseDto } from './dto/create-expense.dto';

@Injectable()
export class ExpensesService {
  async createExpense(companyId: string, dto: CreateExpenseDto) {
    return Expense.create({
      ...dto,
      company_id: companyId,
      amount: Number(dto.amount),
      gst_amount: Number(dto.gst_amount || 0),
    } as any);
  }

  async getExpenses(
    companyId: string,
    filters?: {
      startDate?: string;
      endDate?: string;
      category?: string;
      expenseType?: string;
      paymentMode?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const whereClause: any = { company_id: companyId };

    if (filters?.startDate && filters?.endDate) {
      whereClause.expense_date = {
        [Op.between]: [filters.startDate, filters.endDate],
      };
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

    if (filters?.search) {
      whereClause[Op.or] = [
        { payee_name: { [Op.iLike]: `%${filters.search}%` } },
        { description: { [Op.iLike]: `%${filters.search}%` } },
        { reference_no: { [Op.iLike]: `%${filters.search}%` } },
        { expense_type: { [Op.iLike]: `%${filters.search}%` } },
      ];
    }

    const expenses = await Expense.findAll({
      where: whereClause,
      order: [['expense_date', 'DESC'], ['created_at', 'DESC']],
    });

    const expenseItems = expenses.map((e) => ({
      id: e.id,
      company_id: e.company_id,
      category: e.category,
      expense_type: e.expense_type,
      payee_name: e.payee_name,
      expense_date: e.expense_date,
      amount: Number(e.amount),
      payment_mode: e.payment_mode,
      reference_no: e.reference_no,
      is_gst_applicable: e.is_gst_applicable,
      gst_amount: Number(e.gst_amount || 0),
      description: e.description,
      created_at: e.created_at,
      updated_at: e.updated_at,
    }));

    // If category is not DIRECT, also include Karigar Advances (Uchapat) as Indirect Expenses
    let uchapatItems: any[] = [];
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
        include: [{ model: Karigar, as: 'karigar', attributes: ['id', 'name', 'mobile'] }],
        order: [['date', 'DESC'], ['created_at', 'DESC']],
      });

      uchapatItems = uchapats
        .filter((u: any) => {
          if (!filters?.search) return true;
          const s = filters.search.toLowerCase();
          const karigarName = (u.karigar?.name || '').toLowerCase();
          const reason = (u.reason || '').toLowerCase();
          return karigarName.includes(s) || reason.includes(s) || s.includes('advance') || s.includes('uchapat');
        })
        .map((u: any) => ({
          id: `uchapat-${u.id}`,
          company_id: u.company_id,
          category: 'INDIRECT',
          expense_type: 'ADVANCE',
          payee_name: u.karigar?.name ? `${u.karigar.name} (Karigar Advance)` : 'Karigar Advance',
          expense_date: u.date,
          amount: Number(u.amount),
          payment_mode: u.payment_mode || 'CASH',
          reference_no: u.is_settled ? 'UCHAPAT (SETTLED)' : 'UCHAPAT',
          is_gst_applicable: false,
          gst_amount: 0,
          description: u.reason || `Advance / Uchapat given to ${u.karigar?.name || 'Karigar'}`,
          created_at: u.created_at,
          updated_at: u.updated_at,
        }));
    }

    // Merge and sort combined list
    const combined = [...expenseItems, ...uchapatItems].sort((a, b) => {
      const dateA = new Date(a.expense_date).getTime();
      const dateB = new Date(b.expense_date).getTime();
      return dateB - dateA;
    });

    const page = Number(filters?.page || 1);
    const limit = Number(filters?.limit || 50);
    const offset = (page - 1) * limit;
    const paginated = combined.slice(offset, offset + limit);

    return {
      expenses: paginated,
      total: combined.length,
      page,
      totalPages: Math.ceil(combined.length / limit),
    };
  }

  async getExpenseById(companyId: string, id: string) {
    if (id.startsWith('uchapat-')) {
      const uchapatId = id.replace('uchapat-', '');
      const uchapat = await KarigarUchapat.findOne({
        where: { id: uchapatId, company_id: companyId },
        include: [{ model: Karigar, as: 'karigar', attributes: ['name', 'mobile'] }],
      });
      if (uchapat) {
        return {
          id: `uchapat-${uchapat.id}`,
          company_id: uchapat.company_id,
          category: 'INDIRECT',
          expense_type: 'ADVANCE',
          payee_name: (uchapat as any).karigar?.name || 'Karigar Advance',
          expense_date: uchapat.date,
          amount: Number(uchapat.amount),
          payment_mode: uchapat.payment_mode || 'CASH',
          reference_no: uchapat.is_settled ? 'UCHAPAT (SETTLED)' : 'UCHAPAT',
          is_gst_applicable: false,
          gst_amount: 0,
          description: uchapat.reason || 'Karigar Advance / Uchapat',
          created_at: uchapat.created_at,
          updated_at: uchapat.updated_at,
        };
      }
    }

    const expense = await Expense.findOne({
      where: { id, company_id: companyId },
    });
    if (!expense) {
      throw new NotFoundException(`Expense ${id} not found`);
    }
    return expense;
  }

  async updateExpense(companyId: string, id: string, dto: UpdateExpenseDto) {
    const expense = await this.getExpenseById(companyId, id);
    if ((expense as any).update) {
      return (expense as any).update(dto as any);
    }
    return expense;
  }

  async deleteExpense(companyId: string, id: string) {
    if (id.startsWith('uchapat-')) {
      const uchapatId = id.replace('uchapat-', '');
      const uchapat = await KarigarUchapat.findOne({ where: { id: uchapatId, company_id: companyId } });
      if (uchapat) {
        await uchapat.destroy();
        return { success: true, message: `Advance record ${id} deleted` };
      }
    }

    const expense = await Expense.findOne({ where: { id, company_id: companyId } });
    if (expense) {
      await expense.destroy();
      return { success: true, message: `Expense ${id} deleted` };
    }

    const uchapat = await KarigarUchapat.findOne({ where: { id, company_id: companyId } });
    if (uchapat) {
      await uchapat.destroy();
      return { success: true, message: `Advance record ${id} deleted` };
    }

    throw new NotFoundException(`Expense ${id} not found`);
  }

  async getExpensesSummary(companyId: string, startDate?: string, endDate?: string) {
    const whereClause: any = { company_id: companyId };
    const uchapatWhere: any = { company_id: companyId };

    if (startDate && endDate) {
      whereClause.expense_date = { [Op.between]: [startDate, endDate] };
      uchapatWhere.date = { [Op.between]: [startDate, endDate] };
    }

    const [expenses, uchapats] = await Promise.all([
      Expense.findAll({
        where: whereClause,
        attributes: ['category', 'expense_type', 'amount', 'gst_amount'],
      }),
      KarigarUchapat.findAll({
        where: uchapatWhere,
        attributes: ['amount'],
      }),
    ]);

    let totalDirect = 0;
    let totalIndirect = 0;
    let totalGst = 0;
    const directByType: Record<string, number> = {};
    const indirectByType: Record<string, number> = {};

    for (const exp of expenses) {
      const amt = Number(exp.amount || 0);
      const gst = Number(exp.gst_amount || 0);
      totalGst += gst;

      if (exp.category === 'DIRECT') {
        totalDirect += amt;
        directByType[exp.expense_type] = (directByType[exp.expense_type] || 0) + amt;
      } else {
        totalIndirect += amt;
        indirectByType[exp.expense_type] = (indirectByType[exp.expense_type] || 0) + amt;
      }
    }

    // Add Karigar Uchapat Advances under Indirect Expenses
    const totalUchapat = uchapats.reduce((sum, u) => sum + Number(u.amount || 0), 0);
    totalIndirect += totalUchapat;
    indirectByType['ADVANCE'] = (indirectByType['ADVANCE'] || 0) + totalUchapat;

    return {
      count: expenses.length + uchapats.length,
      total_direct: totalDirect,
      total_indirect: totalIndirect,
      grand_total: totalDirect + totalIndirect,
      total_gst: totalGst,
      direct_by_type: directByType,
      indirect_by_type: indirectByType,
    };
  }
}
