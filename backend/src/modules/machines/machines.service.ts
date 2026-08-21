import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Machine } from '../../database/models/machine.model';
import { Company } from '../../database/models/company.model';
import { CreateMachineDto, UpdateMachineDto } from './dto/machine.dto';

@Injectable()
export class MachinesService {
  async createMachine(companyId: string, dto: CreateMachineDto) {
    const existing = await Machine.findOne({
      where: { company_id: companyId, machine_no: dto.machine_no },
    });

    if (existing) {
      throw new ConflictException(`Machine '${dto.machine_no}' already exists in this company`);
    }

    const machine = await Machine.create({
      ...dto,
      company_id: companyId,
    } as any);

    // Update company machine count
    const totalCount = await Machine.count({ where: { company_id: companyId, is_active: true } });
    await Company.update({ machine_count: totalCount }, { where: { id: companyId } });

    return machine;
  }

  async getMachines(companyId: string) {
    return Machine.findAll({
      where: { company_id: companyId },
      order: [['machine_no', 'ASC']],
    });
  }

  async getMachineById(companyId: string, id: string) {
    const machine = await Machine.findOne({
      where: { id, company_id: companyId },
    });

    if (!machine) {
      throw new NotFoundException(`Machine '${id}' not found`);
    }

    return machine;
  }

  async updateMachine(companyId: string, id: string, dto: UpdateMachineDto) {
    const machine = await this.getMachineById(companyId, id);
    await machine.update(dto);
    return machine;
  }

  async deleteMachine(companyId: string, id: string) {
    const machine = await this.getMachineById(companyId, id);
    await machine.destroy();

    const totalCount = await Machine.count({ where: { company_id: companyId, is_active: true } });
    await Company.update({ machine_count: totalCount }, { where: { id: companyId } });

    return { message: `Machine ${machine.machine_no} removed successfully` };
  }
}
