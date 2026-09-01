import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Op } from 'sequelize';
import { DailyShiftLog } from '../../database/models/daily-shift-log.model';
import { Machine } from '../../database/models/machine.model';
import { Karigar } from '../../database/models/karigar.model';
import { InwardChallan } from '../../database/models/inward-challan.model';
import { ChallanStatus } from '../../common/enums/challan-status.enum';
import { CreateShiftLogDto, UpdateShiftLogDto } from './dto/shift-log.dto';

@Injectable()
export class ShiftLogsService {
  async createShiftLog(companyId: string, dto: CreateShiftLogDto) {
    if (dto.end_counter < dto.start_counter) {
      throw new BadRequestException('End counter must be greater than or equal to start counter');
    }

    const machine = await Machine.findOne({
      where: { id: dto.machine_id, company_id: companyId },
    });
    if (!machine) {
      throw new NotFoundException(`Machine '${dto.machine_id}' not found`);
    }

    const karigar = await Karigar.findOne({
      where: { id: dto.karigar_id, company_id: companyId },
    });
    if (!karigar) {
      throw new NotFoundException(`Karigar '${dto.karigar_id}' not found`);
    }

    let inwardChallan: InwardChallan | null = null;
    if (dto.inward_challan_id) {
      inwardChallan = await InwardChallan.findOne({
        where: { id: dto.inward_challan_id, company_id: companyId },
      });
      if (!inwardChallan) {
        throw new NotFoundException(`Inward Lot '${dto.inward_challan_id}' not found`);
      }
      if (inwardChallan.status === ChallanStatus.COMPLETED) {
        throw new BadRequestException(`Inward Lot #${inwardChallan.lot_no} is already marked COMPLETED`);
      }

      // Check if this specific design is already exhausted/completed
      const rawItems = Array.isArray(inwardChallan.items)
        ? inwardChallan.items.filter((it: any) => it && typeof it === 'object' && !Array.isArray(it) && it.design_no)
        : [];

      let allocatedMeters = 0;
      if (rawItems.length > 0) {
        const foundItem = rawItems.find((it: any) => it.design_no === dto.design_no);
        if (foundItem) {
          allocatedMeters = Number(foundItem.meters || 0);
        }
      } else if (inwardChallan.design_no === dto.design_no) {
        allocatedMeters = Number(inwardChallan.inward_meters || 0);
      }

      if (allocatedMeters > 0) {
        const pastShifts = await DailyShiftLog.findAll({
          where: {
            company_id: companyId,
            inward_challan_id: dto.inward_challan_id,
            design_no: dto.design_no,
          },
          attributes: ['total_meters'],
        });
        const pastMeters = pastShifts.reduce((acc, s) => acc + Number(s.total_meters || 0), 0);
        if (pastMeters >= allocatedMeters) {
          throw new BadRequestException(
            `Design '${dto.design_no}' on Lot #${inwardChallan.lot_no} is already fully completed (${pastMeters}m produced / ${allocatedMeters}m quota).`,
          );
        }
      }
    }

    const totalStitches = dto.end_counter - dto.start_counter;

    const shiftLog = await DailyShiftLog.create({
      ...dto,
      total_stitches: totalStitches,
      company_id: companyId,
    } as any);

    // After creating the shift log, check if all designs in this inward lot are now completed
    if (inwardChallan) {
      const allShifts = await DailyShiftLog.findAll({
        where: {
          company_id: companyId,
          inward_challan_id: inwardChallan.id,
        },
        attributes: ['design_no', 'total_meters'],
      });

      const productionByDesign: Record<string, number> = {};
      for (const s of allShifts) {
        productionByDesign[s.design_no] = (productionByDesign[s.design_no] || 0) + Number(s.total_meters || 0);
      }

      const rawItems = Array.isArray(inwardChallan.items)
        ? inwardChallan.items.filter((it: any) => it && typeof it === 'object' && !Array.isArray(it) && it.design_no)
        : [];

      let allDone = true;
      if (rawItems.length > 0) {
        for (const it of rawItems) {
          const alloc = Number(it.meters || 0);
          const prod = productionByDesign[it.design_no] || 0;
          if (alloc > 0 && prod < alloc) {
            allDone = false;
            break;
          }
        }
      } else if (inwardChallan.design_no) {
        const alloc = Number(inwardChallan.inward_meters || 0);
        const prod = productionByDesign[inwardChallan.design_no] || 0;
        if (alloc > 0 && prod < alloc) {
          allDone = false;
        }
      }

      if (allDone) {
        await inwardChallan.update({ status: ChallanStatus.COMPLETED });
      }
    }

    return shiftLog;
  }

  async getShiftLogs(
    companyId: string,
    options: {
      machine_id?: string;
      karigar_id?: string;
      inward_challan_id?: string;
      shift_type?: string;
      startDate?: string;
      endDate?: string;
    } = {},
  ) {
    const where: any = { company_id: companyId };

    if (options.machine_id) where.machine_id = options.machine_id;
    if (options.karigar_id) where.karigar_id = options.karigar_id;
    if (options.inward_challan_id) where.inward_challan_id = options.inward_challan_id;
    if (options.shift_type) where.shift_type = options.shift_type;
    if (options.startDate && options.endDate) {
      where.shift_date = { [Op.between]: [options.startDate, options.endDate] };
    }

    return DailyShiftLog.findAll({
      where,
      include: [
        { model: Machine, as: 'machine', attributes: ['id', 'machine_no', 'head_count', 'rpm'] },
        { model: Karigar, as: 'karigar', attributes: ['id', 'name', 'mobile', 'wage_type'] },
        { model: InwardChallan, as: 'inwardChallan', attributes: ['id', 'challan_no', 'lot_no', 'trader_name'] },
      ],
      order: [['shift_date', 'DESC'], ['created_at', 'DESC']],
    });
  }

  async getShiftLogById(companyId: string, id: string) {
    const log = await DailyShiftLog.findOne({
      where: { id, company_id: companyId },
      include: [
        { model: Machine, as: 'machine' },
        { model: Karigar, as: 'karigar' },
        { model: InwardChallan, as: 'inwardChallan' },
      ],
    });

    if (!log) {
      throw new NotFoundException(`Shift log '${id}' not found`);
    }

    return log;
  }

  async updateShiftLog(companyId: string, id: string, dto: UpdateShiftLogDto) {
    const log = await this.getShiftLogById(companyId, id);

    let start = dto.start_counter !== undefined ? dto.start_counter : log.start_counter;
    let end = dto.end_counter !== undefined ? dto.end_counter : log.end_counter;

    if (end < start) {
      throw new BadRequestException('End counter must be greater than or equal to start counter');
    }

    const totalStitches = end - start;

    await log.update({
      ...dto,
      total_stitches: totalStitches,
    });

    return log;
  }

  async deleteShiftLog(companyId: string, id: string) {
    const log = await this.getShiftLogById(companyId, id);
    await log.destroy();
    return { message: 'Shift log deleted successfully' };
  }

  async getDowntimeStats(companyId: string, startDate?: string, endDate?: string) {
    const where: any = { company_id: companyId };
    if (startDate && endDate) {
      where.shift_date = { [Op.between]: [startDate, endDate] };
    }

    const logs = await DailyShiftLog.findAll({
      where,
      attributes: ['machine_id', 'downtime_minutes', 'downtime_reason'],
      include: [{ model: Machine, as: 'machine', attributes: ['machine_no'] }],
    });

    const totalDowntimeMinutes = logs.reduce((acc, l) => acc + (l.downtime_minutes || 0), 0);
    const reasonBreakdown: Record<string, number> = {};

    logs.forEach((l) => {
      if (l.downtime_reason && l.downtime_minutes > 0) {
        reasonBreakdown[l.downtime_reason] =
          (reasonBreakdown[l.downtime_reason] || 0) + l.downtime_minutes;
      }
    });

    return {
      totalDowntimeMinutes,
      totalDowntimeHours: Number((totalDowntimeMinutes / 60).toFixed(2)),
      reasonBreakdown,
      logsCount: logs.length,
    };
  }
}
