import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Op } from 'sequelize';
import { KarigarUchapat } from '../../database/models/karigar-uchapat.model';
import { Karigar } from '../../database/models/karigar.model';
import { User } from '../../database/models/user.model';
import { CreateUchapatDto, UpdateUchapatDto } from './dto/uchapat.dto';

@Injectable()
export class UchapatService {
  async createUchapat(companyId: string, userId: string, dto: CreateUchapatDto) {
    const karigar = await Karigar.findOne({
      where: { id: dto.karigar_id, company_id: companyId },
    });

    if (!karigar) {
      throw new NotFoundException(`Karigar '${dto.karigar_id}' not found in this company`);
    }

    return KarigarUchapat.create({
      ...dto,
      company_id: companyId,
      approved_by: userId,
      is_settled: false,
    } as any);
  }

  async getUchapats(
    companyId: string,
    options: {
      karigar_id?: string;
      startDate?: string;
      endDate?: string;
      is_settled?: boolean;
    } = {},
  ) {
    const where: any = { company_id: companyId };

    if (options.karigar_id) {
      where.karigar_id = options.karigar_id;
    }

    if (options.startDate && options.endDate) {
      where.date = { [Op.between]: [options.startDate, options.endDate] };
    }

    if (typeof options.is_settled === 'boolean') {
      where.is_settled = options.is_settled;
    }

    return KarigarUchapat.findAll({
      where,
      include: [
        { model: Karigar, as: 'karigar', attributes: ['id', 'name', 'mobile', 'wage_type'] },
        { model: User, as: 'approver', attributes: ['id', 'full_name'] },
      ],
      order: [['date', 'DESC']],
    });
  }

  async getKarigarUchapatSummary(companyId: string, karigarId: string) {
    const totalAdvances = await KarigarUchapat.sum('amount', {
      where: { company_id: companyId, karigar_id: karigarId },
    });

    const unsettledAdvances = await KarigarUchapat.sum('amount', {
      where: { company_id: companyId, karigar_id: karigarId, is_settled: false },
    });

    const recentRecords = await KarigarUchapat.findAll({
      where: { company_id: companyId, karigar_id: karigarId },
      limit: 10,
      order: [['date', 'DESC']],
    });

    return {
      karigarId,
      totalAdvancesAmount: totalAdvances || 0,
      unsettledAdvancesAmount: unsettledAdvances || 0,
      recentRecords,
    };
  }

  async updateUchapat(companyId: string, id: string, dto: UpdateUchapatDto) {
    const record = await KarigarUchapat.findOne({
      where: { id, company_id: companyId },
    });

    if (!record) {
      throw new NotFoundException(`Uchapat entry '${id}' not found`);
    }

    if (record.is_settled) {
      throw new BadRequestException('Cannot modify an already settled Uchapat entry');
    }

    await record.update(dto);
    return record;
  }

  async deleteUchapat(companyId: string, id: string) {
    const record = await KarigarUchapat.findOne({
      where: { id, company_id: companyId },
    });

    if (!record) {
      throw new NotFoundException(`Uchapat entry '${id}' not found`);
    }

    if (record.is_settled) {
      throw new BadRequestException('Cannot delete an already settled Uchapat entry');
    }

    await record.destroy();
    return { message: 'Uchapat advance record deleted successfully' };
  }
}
