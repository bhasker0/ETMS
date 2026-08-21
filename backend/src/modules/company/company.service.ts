import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Company } from '../../database/models/company.model';
import { UserCompanyRole } from '../../database/models/user-company-role.model';
import { User } from '../../database/models/user.model';
import { UpdateCompanyDto, AddCompanyMemberDto } from './dto/company.dto';

@Injectable()
export class CompanyService {
  async getCompanyById(companyId: string) {
    const company = await Company.findByPk(companyId, {
      include: [
        {
          model: UserCompanyRole,
          as: 'userCompanyRoles',
          include: [{ model: User, as: 'user', attributes: ['id', 'full_name', 'mobile', 'email'] }],
        },
      ],
    });

    if (!company) {
      throw new NotFoundException(`Company with ID '${companyId}' not found`);
    }

    return company;
  }

  async updateCompany(companyId: string, dto: UpdateCompanyDto) {
    const company = await Company.findByPk(companyId);
    if (!company) {
      throw new NotFoundException(`Company with ID '${companyId}' not found`);
    }

    if (dto.settings && company.settings) {
      dto.settings = { ...company.settings, ...dto.settings };
    }

    await company.update(dto);
    return company;
  }

  async getMembers(companyId: string) {
    return UserCompanyRole.findAll({
      where: { company_id: companyId, is_active: true },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'full_name', 'mobile', 'email', 'status'],
        },
      ],
    });
  }

  async addMember(companyId: string, dto: AddCompanyMemberDto) {
    const user = await User.findOne({ where: { mobile: dto.mobile } });
    if (!user) {
      throw new NotFoundException(
        `User with mobile '${dto.mobile}' does not exist. They must register first.`,
      );
    }

    const existingRole = await UserCompanyRole.findOne({
      where: { user_id: user.id, company_id: companyId },
    });

    if (existingRole) {
      if (existingRole.is_active) {
        throw new ConflictException('User is already an active member of this company');
      }
      await existingRole.update({
        is_active: true,
        role: dto.role,
        permissions: dto.permissions || [],
      });
      return existingRole;
    }

    return UserCompanyRole.create({
      user_id: user.id,
      company_id: companyId,
      role: dto.role,
      permissions: dto.permissions || [],
      is_active: true,
    } as any);
  }

  async removeMember(companyId: string, memberId: string) {
    const roleRecord = await UserCompanyRole.findOne({
      where: { id: memberId, company_id: companyId },
    });

    if (!roleRecord) {
      throw new NotFoundException('Company member mapping not found');
    }

    await roleRecord.update({ is_active: false });
    return { message: 'Member removed from company successfully' };
  }
}
