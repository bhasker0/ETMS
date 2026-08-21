import { Injectable, NotFoundException } from '@nestjs/common';
import { Op } from 'sequelize';
import { InwardChallan } from '../../database/models/inward-challan.model';
import { DailyShiftLog } from '../../database/models/daily-shift-log.model';
import { OutwardInvoice } from '../../database/models/outward-invoice.model';
import { CreateInwardChallanDto, UpdateInwardChallanDto } from './dto/inward-challan.dto';

@Injectable()
export class InwardChallansService {
  async createChallan(companyId: string, dto: CreateInwardChallanDto) {
    let challanNo = dto.challan_no;
    if (!challanNo) {
      const currentYear = new Date().getFullYear();
      const count = await InwardChallan.count({ where: { company_id: companyId } });
      challanNo = `CH-${currentYear}-${String(count + 1).padStart(4, '0')}`;
    }

    return InwardChallan.create({
      ...dto,
      challan_no: challanNo,
      company_id: companyId,
    } as any);
  }

  async getChallans(
    companyId: string,
    options: {
      status?: string;
      search?: string;
      startDate?: string;
      endDate?: string;
    } = {},
  ) {
    const where: any = { company_id: companyId };

    if (options.status) {
      where.status = options.status;
    }

    if (options.startDate && options.endDate) {
      where.challan_date = { [Op.between]: [options.startDate, options.endDate] };
    }

    if (options.search) {
      where[Op.or] = [
        { challan_no: { [Op.iLike]: `%${options.search}%` } },
        { trader_name: { [Op.iLike]: `%${options.search}%` } },
        { lot_no: { [Op.iLike]: `%${options.search}%` } },
        { design_no: { [Op.iLike]: `%${options.search}%` } },
      ];
    }

    return InwardChallan.findAll({
      where,
      order: [['challan_date', 'DESC'], ['created_at', 'DESC']],
    });
  }

  async getChallanById(companyId: string, id: string) {
    const challan = await InwardChallan.findOne({
      where: { id, company_id: companyId },
      include: [
        { model: DailyShiftLog, as: 'shiftLogs' },
        { model: OutwardInvoice, as: 'outwardInvoices' },
      ],
    });

    if (!challan) {
      throw new NotFoundException(`Inward Challan '${id}' not found`);
    }

    return challan;
  }

  async updateChallan(companyId: string, id: string, dto: UpdateInwardChallanDto) {
    const challan = await this.getChallanById(companyId, id);
    await challan.update(dto);
    return challan;
  }

  async deleteChallan(companyId: string, id: string) {
    const challan = await this.getChallanById(companyId, id);
    await challan.destroy();
    return { message: `Inward Challan ${challan.challan_no} deleted successfully` };
  }
}
