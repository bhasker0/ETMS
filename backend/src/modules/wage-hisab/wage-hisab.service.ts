import { Injectable, NotFoundException } from '@nestjs/common';
import { Op } from 'sequelize';
import { Karigar } from '../../database/models/karigar.model';
import { DailyShiftLog } from '../../database/models/daily-shift-log.model';
import { KarigarUchapat } from '../../database/models/karigar-uchapat.model';
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
      include: [{ model: Machine, as: 'machine', attributes: ['machine_no', 'head_count'] }],
      order: [['shift_date', 'ASC']],
    });

    const totalMeters = shifts.reduce((acc, s) => acc + Number(s.total_meters || 0), 0);
    const totalStitches = shifts.reduce((acc, s) => acc + Number(s.total_stitches || 0), 0);

    // 2. Compute Gross Earnings based on wage type
    let grossEarnings = 0;
    let baseSalary = 0;
    let incentiveCommission = 0;

    if (karigar.wage_type === WageType.PIECE_RATE) {
      const rate = Number(karigar.default_rate_per_meter || 1.2);
      grossEarnings = Number((totalMeters * rate).toFixed(2));
    } else if (karigar.wage_type === WageType.FIXED_MONTHLY) {
      // FIXED_MONTHLY: fortnightly is half-month wage
      const monthly = Number(karigar.default_monthly_salary || 18000);
      baseSalary = Number((monthly / 2).toFixed(2));
      grossEarnings = baseSalary;
    } else if (karigar.wage_type === WageType.FIXED_PLUS_INCENTIVE) {
      // FIXED_PLUS_INCENTIVE: Fortnight base salary + incentive commission above threshold
      const monthly = Number(karigar.default_monthly_salary || 18000);
      baseSalary = Number((monthly / 2).toFixed(2));

      const thresholdVal = Number(karigar.incentive_threshold_value || 100000) / 2; // fortnight threshold
      const incRate = Number(karigar.incentive_rate || 0.25);
      const incType = karigar.incentive_rate_type || 'PER_1K_STITCHES';

      if (incType === 'PER_1K_STITCHES') {
        const excessStitches = Math.max(0, totalStitches - thresholdVal);
        incentiveCommission = Number(((excessStitches / 1000) * incRate).toFixed(2));
      } else if (incType === 'PER_PIECE') {
        const estimatedPieces = Math.floor(totalMeters / 6); // standard 6m saree
        const excessPieces = Math.max(0, estimatedPieces - thresholdVal);
        incentiveCommission = Number((excessPieces * incRate).toFixed(2));
      } else {
        const excessMeters = Math.max(0, totalMeters - thresholdVal);
        incentiveCommission = Number((excessMeters * incRate).toFixed(2));
      }

      grossEarnings = Number((baseSalary + incentiveCommission).toFixed(2));
    }

    // 3. Fetch all Uchapat (Cash/UPI advances) in this period
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

    // 4. Karigar Fortnightly Wage Hisab: Net Pay = (Gross Output) - (Uchapat Advances) - (Deductions)
    const netPayable = Number((grossEarnings - totalUchapatAdvances - deductions).toFixed(2));

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
      rate_per_meter: Number(karigar.default_rate_per_meter || 1.2),
      gross_earnings: grossEarnings,
      total_uchapat_advances: totalUchapatAdvances,
      deductions,
      deduction_reason: dto.deduction_reason || '',
      net_payable: netPayable,
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
        baseSalary,
        incentiveCommission,
        grossEarnings,
        totalUchapatAdvances,
        deductions,
        deduction_reason: dto.deduction_reason || null,
        netPayable,
      },
      shifts: shifts.map((s) => ({
        id: s.id,
        shift_date: s.shift_date,
        shift_type: s.shift_type,
        machine_no: s.machine?.machine_no || 'N/A',
        design_no: s.design_no,
        total_meters: Number(s.total_meters || 0),
        total_stitches: Number(s.total_stitches || 0),
      })),
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
