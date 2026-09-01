import { Injectable, NotFoundException } from '@nestjs/common';
import { Op } from 'sequelize';
import { InwardChallan } from '../../database/models/inward-challan.model';
import { DailyShiftLog } from '../../database/models/daily-shift-log.model';
import { OutwardInvoice } from '../../database/models/outward-invoice.model';
import { ChallanStatus } from '../../common/enums/challan-status.enum';
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

    const challanDate = dto.challan_date || new Date().toISOString().split('T')[0];

    return InwardChallan.create({
      ...dto,
      challan_no: challanNo,
      challan_date: challanDate,
      company_id: companyId,
    } as any);
  }

  async getActivePendingLotsAndDesigns(companyId: string) {
    const challans = await InwardChallan.findAll({
      where: {
        company_id: companyId,
        status: { [Op.ne]: ChallanStatus.COMPLETED },
      },
      order: [['challan_date', 'DESC'], ['created_at', 'DESC']],
    });

    if (challans.length === 0) return [];

    const challanIds = challans.map((c) => c.id);
    const shiftLogs = await DailyShiftLog.findAll({
      where: {
        company_id: companyId,
        inward_challan_id: { [Op.in]: challanIds },
      },
      attributes: ['inward_challan_id', 'design_no', 'total_meters', 'total_stitches'],
    });

    // Sum produced meters by (inward_challan_id, design_no)
    const productionMap: Record<string, { meters: number; stitches: number }> = {};
    for (const log of shiftLogs) {
      const key = `${log.inward_challan_id}__${log.design_no}`;
      if (!productionMap[key]) {
        productionMap[key] = { meters: 0, stitches: 0 };
      }
      productionMap[key].meters += Number(log.total_meters || 0);
      productionMap[key].stitches += Number(log.total_stitches || 0);
    }

    const result = [];

    for (const challan of challans) {
      const pendingDesigns: Array<{
        design_no: string;
        stitch_count: number;
        commission_type: string;
        commission_rate: number;
        jobwork_price_per_1k: number;
        allocated_meters: number;
        produced_meters: number;
        remaining_meters: number;
        is_completed: boolean;
        than_count?: number;
      }> = [];

      const rawItems = Array.isArray(challan.items)
        ? challan.items.filter((it: any) => it && typeof it === 'object' && !Array.isArray(it) && it.design_no)
        : [];

      if (rawItems.length > 0) {
        for (const item of rawItems) {
          const key = `${challan.id}__${item.design_no}`;
          const prod = productionMap[key] || { meters: 0, stitches: 0 };
          const allocatedMeters = Number(item.meters || 0);
          const producedMeters = prod.meters;
          const remainingMeters = Math.max(0, allocatedMeters - producedMeters);
          const isCompleted = allocatedMeters > 0 && producedMeters >= allocatedMeters;

          if (!isCompleted) {
            pendingDesigns.push({
              design_no: item.design_no,
              stitch_count: item.stitch_count || challan.stitch_count || 0,
              commission_type: item.commission_type || challan.karigar_commission_type || 'PER_1K_STITCHES',
              commission_rate: item.commission_rate ?? challan.karigar_commission_rate ?? 0,
              jobwork_price_per_1k: item.jobwork_price_per_1k ?? challan.jobwork_price_per_1k ?? 0,
              allocated_meters: allocatedMeters,
              produced_meters: producedMeters,
              remaining_meters: remainingMeters,
              is_completed: isCompleted,
              than_count: item.than_count,
            });
          }
        }
      } else if (challan.design_no) {
        const key = `${challan.id}__${challan.design_no}`;
        const prod = productionMap[key] || { meters: 0, stitches: 0 };
        const allocatedMeters = Number(challan.inward_meters || 0);
        const producedMeters = prod.meters;
        const remainingMeters = Math.max(0, allocatedMeters - producedMeters);
        const isCompleted = allocatedMeters > 0 && producedMeters >= allocatedMeters;

        if (!isCompleted) {
          pendingDesigns.push({
            design_no: challan.design_no,
            stitch_count: challan.stitch_count || 0,
            commission_type: challan.karigar_commission_type || 'PER_1K_STITCHES',
            commission_rate: challan.karigar_commission_rate || 0,
            jobwork_price_per_1k: challan.jobwork_price_per_1k || 0,
            allocated_meters: allocatedMeters,
            produced_meters: producedMeters,
            remaining_meters: remainingMeters,
            is_completed: isCompleted,
            than_count: challan.than_count,
          });
        }
      }

      // If all designs are completed, auto-update challan status to COMPLETED
      if (pendingDesigns.length === 0) {
        await challan.update({ status: ChallanStatus.COMPLETED });
      } else {
        result.push({
          id: challan.id,
          challan_no: challan.challan_no,
          challan_date: challan.challan_date,
          lot_no: challan.lot_no,
          trader_name: challan.trader_name,
          fabric_quality: challan.fabric_quality,
          inward_meters: challan.inward_meters,
          status: challan.status,
          pending_designs: pendingDesigns,
        });
      }
    }

    return result;
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
