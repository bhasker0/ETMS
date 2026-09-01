import { Injectable, NotFoundException } from '@nestjs/common';
import { Op } from 'sequelize';
import { Karigar } from '../../database/models/karigar.model';
import { DailyShiftLog } from '../../database/models/daily-shift-log.model';
import { KarigarUchapat } from '../../database/models/karigar-uchapat.model';
import { InwardChallan } from '../../database/models/inward-challan.model';
import { Machine } from '../../database/models/machine.model';
import { Company } from '../../database/models/company.model';
import { PdfService } from '../pdf/pdf.service';
import { WageType } from '../../common/enums/wage-type.enum';
import { GenerateWageHisabDto } from './dto/wage-hisab.dto';

@Injectable()
export class WageHisabService {
  constructor(private pdfService: PdfService) {}

  async calculateHisab(companyId: string, dto: GenerateWageHisabDto) {
    const karigar = await Karigar.findOne({
      where: { id: dto.karigar_id, company_id: companyId },
    });

    if (!karigar) {
      throw new NotFoundException(`Karigar '${dto.karigar_id}' not found`);
    }

    // 1. Fetch all shift logs for this Karigar within the fortnight period
    const shifts = await DailyShiftLog.findAll({
      where: {
        company_id: companyId,
        karigar_id: dto.karigar_id,
        shift_date: { [Op.between]: [dto.startDate, dto.endDate] },
      },
      include: [
        { model: Machine, as: 'machine', attributes: ['machine_no', 'head_count'] },
        { model: InwardChallan, as: 'inwardChallan' },
      ],
      order: [['shift_date', 'ASC']],
    });

    const totalMeters = shifts.reduce((acc, s) => acc + Number(s.total_meters || 0), 0);
    const totalStitches = shifts.reduce((acc, s) => acc + Number(s.total_stitches || 0), 0);

    // 2. Compute individual shift earnings based on design specifications
    const shiftBreakdowns = shifts.map((s) => {
      const shiftMeters = Number(s.total_meters || 0);
      const shiftStitches = Number(s.total_stitches || 0);

      let designStitchCount = Number(s.inwardChallan?.stitch_count || 0);
      let commRate = s.inwardChallan?.karigar_commission_rate;
      let commType = s.inwardChallan?.karigar_commission_type || 'PER_1K_STITCHES';

      // If inward challan has multi-design items breakdown, match s.design_no
      if (s.inwardChallan?.items && Array.isArray(s.inwardChallan.items)) {
        const itemMatch = s.inwardChallan.items.find(
          (it: any) => it.design_no && it.design_no.toLowerCase().trim() === (s.design_no || '').toLowerCase().trim()
        );
        if (itemMatch) {
          designStitchCount = Number(itemMatch.stitch_count || designStitchCount);
          commRate = itemMatch.commission_rate ?? commRate;
          commType = itemMatch.commission_type || commType;
        }
      }

      let shiftEarnings = 0;
      let appliedBasis = '';
      let shiftIncentive = 0;

      if (karigar.wage_type === WageType.PIECE_RATE) {
        if (commRate !== undefined && commRate !== null && Number(commRate) > 0) {
          const rateNum = Number(commRate);
          if (commType === 'PER_1K_STITCHES') {
            shiftEarnings = Number(((shiftStitches / 1000) * rateNum).toFixed(2));
            appliedBasis = `₹${rateNum}/1k st (${s.design_no || 'Design'})`;
          } else if (commType === 'PER_PIECE') {
            const pieces = Math.max(1, Math.floor(shiftMeters / 6));
            shiftEarnings = Number((pieces * rateNum).toFixed(2));
            appliedBasis = `₹${rateNum}/saree (${pieces} pcs)`;
          } else {
            shiftEarnings = Number((shiftMeters * rateNum).toFixed(2));
            appliedBasis = `₹${rateNum}/m (${s.design_no || 'Design'})`;
          }
        } else {
          const defaultRate = Number(karigar.default_rate_per_meter || 1.2);
          shiftEarnings = Number((shiftMeters * defaultRate).toFixed(2));
          appliedBasis = `₹${defaultRate}/meter`;
        }
      } else if (karigar.wage_type === WageType.FIXED_PLUS_INCENTIVE) {
        const thresholdVal = Number(karigar.incentive_threshold_value || 100000);
        const thresholdType = karigar.incentive_threshold_type || 'STITCHES';

        // Check if design specifies commission rate, otherwise use karigar incentive rate
        let rateNum = Number(karigar.incentive_rate || 0.25);
        let rateType = karigar.incentive_rate_type || 'PER_1K_STITCHES';

        if (commRate !== undefined && commRate !== null && Number(commRate) > 0) {
          rateNum = Number(commRate);
          rateType = commType || 'PER_1K_STITCHES';
        }

        let excess = 0;
        let thresholdUnit = 'st';
        if (thresholdType === 'STITCHES') {
          thresholdUnit = 'st';
          excess = Math.max(0, shiftStitches - thresholdVal);
          if (rateType === 'PER_1K_STITCHES') {
            shiftIncentive = Number(((excess / 1000) * rateNum).toFixed(2));
          } else if (rateType === 'PER_PIECE') {
            const pieces = Math.max(1, Math.floor(shiftMeters / 6));
            shiftIncentive = Number((pieces * rateNum).toFixed(2));
          } else {
            shiftIncentive = Number((excess * rateNum).toFixed(2));
          }
        } else if (thresholdType === 'PIECES') {
          thresholdUnit = 'pcs';
          const pieces = Math.floor(shiftMeters / 6);
          excess = Math.max(0, pieces - thresholdVal);
          shiftIncentive = Number((excess * rateNum).toFixed(2));
        } else {
          thresholdUnit = 'm';
          excess = Math.max(0, shiftMeters - thresholdVal);
          shiftIncentive = Number((excess * rateNum).toFixed(2));
        }

        shiftEarnings = shiftIncentive;
        const rateUnit = rateType === 'PER_1K_STITCHES' ? '1k st' : rateType === 'PER_PIECE' ? 'saree' : 'm';

        if (shiftIncentive > 0) {
          appliedBasis = `₹${rateNum}/${rateUnit} (> ${thresholdVal.toLocaleString()} ${thresholdUnit})`;
        } else {
          appliedBasis = `Under ${thresholdVal.toLocaleString()} ${thresholdUnit} threshold`;
        }
      } else if (karigar.wage_type === WageType.FIXED_MONTHLY) {
        shiftEarnings = 0;
        appliedBasis = `Fixed Monthly Salary`;
      }

      return {
        id: s.id,
        shift_date: s.shift_date,
        shift_type: s.shift_type,
        machine_no: s.machine?.machine_no || 'N/A',
        design_no: s.design_no || 'N/A',
        total_meters: shiftMeters,
        total_stitches: shiftStitches,
        stitch_count: designStitchCount,
        commission_rate: commRate !== undefined && commRate !== null ? Number(commRate) : null,
        commission_type: commType,
        applied_basis: appliedBasis,
        shift_earnings: shiftEarnings,
        shift_incentive: shiftIncentive,
      };
    });

    // 3. Compute Gross Earnings based on wage type
    let grossEarnings = 0;
    let baseSalary = 0;
    let incentiveCommission = 0;

    if (karigar.wage_type === WageType.PIECE_RATE) {
      grossEarnings = Number(shiftBreakdowns.reduce((acc, sb) => acc + sb.shift_earnings, 0).toFixed(2));
    } else if (karigar.wage_type === WageType.FIXED_MONTHLY) {
      // FIXED_MONTHLY: fortnightly is half-month wage
      const monthly = Number(karigar.default_monthly_salary || 18000);
      baseSalary = Number((monthly / 2).toFixed(2));
      grossEarnings = baseSalary;
    } else if (karigar.wage_type === WageType.FIXED_PLUS_INCENTIVE) {
      // FIXED_PLUS_INCENTIVE: Fortnight base salary + incentive commission above threshold
      const monthly = Number(karigar.default_monthly_salary || 18000);
      baseSalary = Number((monthly / 2).toFixed(2));
      incentiveCommission = Number(
        shiftBreakdowns.reduce((acc, sb) => acc + (sb.shift_incentive || 0), 0).toFixed(2)
      );
      grossEarnings = Number((baseSalary + incentiveCommission).toFixed(2));
    }

    // 4. Fetch all Uchapat (Cash/UPI advances) in this period
    const uchapats = await KarigarUchapat.findAll({
      where: {
        company_id: companyId,
        karigar_id: dto.karigar_id,
        date: { [Op.between]: [dto.startDate, dto.endDate] },
      },
      order: [['date', 'ASC']],
    });

    const totalUchapatAdvances = uchapats.reduce((acc, u) => acc + Number(u.amount || 0), 0);
    const deductions = Number(dto.deductions || 0);

    // 5. Karigar Fortnightly Wage Hisab: Net Pay = (Gross Output) - (Uchapat Advances) - (Deductions)
    const netPayable = Number((grossEarnings - totalUchapatAdvances - deductions).toFixed(2));

    const startD = new Date(dto.startDate);
    const endD = new Date(dto.endDate);
    const periodDays = Math.max(1, Math.round((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const uniqueShiftDates = Array.from(new Set(shifts.map((s) => s.shift_date)));
    const attendedDays = uniqueShiftDates.length;
    const absentDays = Math.max(0, periodDays - attendedDays);

    const monthlySalary = Number(karigar.default_monthly_salary || 0);
    const dailyBaseSalary = monthlySalary > 0 ? Number((monthlySalary / 30).toFixed(2)) : 0;
    const suggestedAbsentDeduction = Number((absentDays * dailyBaseSalary).toFixed(2));

    const startDay = new Date(dto.startDate).getDate();
    const fortnightLabel = startDay <= 15 ? '1st Fortnight (1 to 15)' : '2nd Fortnight (16 to End of Month)';

    return {
      karigar_id: karigar.id,
      karigar_name: karigar.name,
      wage_type: karigar.wage_type,
      startDate: dto.startDate,
      endDate: dto.endDate,
      total_shifts: shifts.length,
      total_meters: Number(totalMeters.toFixed(2)),
      total_stitches: totalStitches,
      rate_per_meter: Number(karigar.default_rate_per_meter || 1.2),
      base_salary: baseSalary,
      incentive_commission: incentiveCommission,
      gross_earnings: grossEarnings,
      total_uchapat_advances: totalUchapatAdvances,
      deductions,
      deduction_reason: dto.deduction_reason || '',
      net_payable: netPayable,
      attendance: {
        total_period_days: periodDays,
        attended_days: attendedDays,
        absent_days: absentDays,
        daily_base_salary: dailyBaseSalary,
        suggested_absent_deduction: suggestedAbsentDeduction,
      },
      karigar: {
        id: karigar.id,
        name: karigar.name,
        mobile: karigar.mobile,
        wage_type: karigar.wage_type,
        rate_per_meter: Number(karigar.default_rate_per_meter || 1.2),
        monthly_salary: Number(karigar.default_monthly_salary || 0),
        incentive_threshold_value: Number(karigar.incentive_threshold_value || 0),
        incentive_threshold_type: karigar.incentive_threshold_type || 'STITCHES',
        incentive_rate: Number(karigar.incentive_rate || 0),
        incentive_rate_type: karigar.incentive_rate_type || 'PER_1K_STITCHES',
      },
      period: {
        startDate: dto.startDate,
        endDate: dto.endDate,
        fortnightLabel,
      },
      summary: {
        totalMeters: Number(totalMeters.toFixed(2)),
        totalStitches,
        shiftsCount: shifts.length,
        periodDays,
        attendedDays,
        absentDays,
        dailyBaseSalary,
        suggestedAbsentDeduction,
        baseSalary,
        incentiveCommission,
        grossEarnings,
        totalUchapatAdvances,
        deductions,
        deduction_reason: dto.deduction_reason || null,
        netPayable,
      },
      shifts: shiftBreakdowns,
      uchapats: uchapats.map((u) => ({
        id: u.id,
        date: u.date,
        amount: Number(u.amount || 0),
        reason: u.reason,
        payment_mode: u.payment_mode,
        is_settled: u.is_settled,
      })),
    };
  }

  async generateHisabPdfBuffer(companyId: string, dto: GenerateWageHisabDto): Promise<Buffer> {
    const hisabData = await this.calculateHisab(companyId, dto);
    const company = await Company.findByPk(companyId);

    return this.pdfService.generateHisabPdf({
      company: {
        name: company?.name || 'Surat Embroidery Works',
        phone: company?.phone || '',
      },
      karigar: hisabData.karigar,
      hisabPeriod: hisabData.period,
      summary: hisabData.summary,
      shifts: hisabData.shifts,
      uchapats: hisabData.uchapats,
    });
  }

  async settleFortnightHisab(companyId: string, dto: GenerateWageHisabDto) {
    const hisab = await this.calculateHisab(companyId, dto);
    const hisabId = `HISAB-${dto.karigar_id.substring(0, 8)}-${dto.startDate}_${dto.endDate}`;

    // Mark uchapat records as settled
    const uchapatIds = hisab.uchapats.map((u) => u.id);
    if (uchapatIds.length > 0) {
      await KarigarUchapat.update(
        { is_settled: true, settlement_hisab_id: hisId(hisabId) },
        { where: { id: { [Op.in]: uchapatIds }, company_id: companyId } },
      );
    }

    return {
      message: 'Fortnightly Hisab settled successfully',
      hisabId,
      netPaid: hisab.summary.netPayable,
    };
  }
}

function hisId(id: string): string {
  return id;
}
