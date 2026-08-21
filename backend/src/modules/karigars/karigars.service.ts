import { Injectable, NotFoundException } from '@nestjs/common';
import { Karigar } from '../../database/models/karigar.model';
import { CreateKarigarDto, UpdateKarigarDto } from './dto/karigar.dto';

@Injectable()
export class KarigarsService {
  async createKarigar(companyId: string, dto: CreateKarigarDto) {
    return Karigar.create({
      ...dto,
      company_id: companyId,
    } as any);
  }

  async getKarigars(companyId: string) {
    return Karigar.findAll({
      where: { company_id: companyId },
      order: [['name', 'ASC']],
    });
  }

  async getKarigarById(companyId: string, id: string) {
    const karigar = await Karigar.findOne({
      where: { id, company_id: companyId },
    });

    if (!karigar) {
      throw new NotFoundException(`Karigar '${id}' not found`);
    }

    return karigar;
  }

  async updateKarigar(companyId: string, id: string, dto: UpdateKarigarDto) {
    const karigar = await this.getKarigarById(companyId, id);
    await karigar.update(dto);
    return karigar;
  }

  async deleteKarigar(companyId: string, id: string) {
    const karigar = await this.getKarigarById(companyId, id);
    await karigar.destroy();
    return { message: `Karigar ${karigar.name} removed successfully` };
  }
}
