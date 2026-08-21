import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Op } from 'sequelize';
import { MunimClient } from '../../database/models/munim-client.model';
import { Company } from '../../database/models/company.model';
import { User } from '../../database/models/user.model';
import { UserCompanyRole } from '../../database/models/user-company-role.model';
import { OutwardInvoice } from '../../database/models/outward-invoice.model';
import { DailyShiftLog } from '../../database/models/daily-shift-log.model';
import { KarigarUchapat } from '../../database/models/karigar-uchapat.model';
import {
  MunimRequestStatus,
  MunimInitiatorType,
} from '../../common/enums/munim-request-status.enum';
import { Role } from '../../common/enums/role.enum';
import {
  MunimInviteCompanyDto,
  CompanyInviteMunimDto,
  RespondMunimRequestDto,
} from './dto/munim.dto';

@Injectable()
export class MunimService {
  async munimInviteCompany(munimUserId: string, dto: MunimInviteCompanyDto) {
    let company: Company | null = null;

    if (dto.gstin) {
      company = await Company.findOne({ where: { gstin: dto.gstin } });
    } else if (dto.companyMobile) {
      company = await Company.findOne({ where: { phone: dto.companyMobile } });
      if (!company) {
        const ownerUser = await User.findOne({ where: { mobile: dto.companyMobile } });
        if (ownerUser) {
          const ownerRole = await UserCompanyRole.findOne({
            where: { user_id: ownerUser.id, role: Role.COMPANY_ADMIN, is_active: true },
          });
          if (ownerRole) {
            company = await Company.findByPk(ownerRole.company_id);
          }
        }
      }
    }

    if (!company) {
      throw new NotFoundException('Target company not found with provided GSTIN or Mobile');
    }

    const existingRequest = await MunimClient.findOne({
      where: {
        munim_user_id: munimUserId,
        company_id: company.id,
        status: { [Op.in]: [MunimRequestStatus.PENDING, MunimRequestStatus.ACCEPTED] },
      },
    });

    if (existingRequest) {
      throw new ConflictException(
        `A relationship or request already exists with status: ${existingRequest.status}`,
      );
    }

    return MunimClient.create({
      munim_user_id: munimUserId,
      company_id: company.id,
      initiator_type: MunimInitiatorType.MUNIM_TO_COMPANY,
      status: MunimRequestStatus.PENDING,
      requested_by_user_id: munimUserId,
      request_notes: dto.notes,
      permissions: dto.requestedPermissions,
    } as any);
  }

  async companyInviteMunim(
    companyId: string,
    companyUserId: string,
    dto: CompanyInviteMunimDto,
  ) {
    const munimUser = await User.findOne({ where: { mobile: dto.munimMobile } });
    if (!munimUser) {
      throw new NotFoundException(
        `Munim (Accountant) with mobile '${dto.munimMobile}' does not exist. They must register first.`,
      );
    }

    const existingRequest = await MunimClient.findOne({
      where: {
        munim_user_id: munimUser.id,
        company_id: companyId,
        status: { [Op.in]: [MunimRequestStatus.PENDING, MunimRequestStatus.ACCEPTED] },
      },
    });

    if (existingRequest) {
      throw new ConflictException(
        `A relationship or request already exists with status: ${existingRequest.status}`,
      );
    }

    return MunimClient.create({
      munim_user_id: munimUser.id,
      company_id: companyId,
      initiator_type: MunimInitiatorType.COMPANY_TO_MUNIM,
      status: MunimRequestStatus.PENDING,
      requested_by_user_id: companyUserId,
      request_notes: dto.notes,
      permissions: dto.grantedPermissions,
    } as any);
  }

  async getMunimRequests(munimUserId: string) {
    return MunimClient.findAll({
      where: { munim_user_id: munimUserId },
      include: [
        {
          model: Company,
          as: 'company',
          attributes: ['id', 'name', 'gstin', 'phone', 'address'],
        },
        {
          model: User,
          as: 'requester',
          attributes: ['id', 'full_name', 'mobile'],
        },
      ],
      order: [['created_at', 'DESC']],
    });
  }

  async getCompanyRequests(companyId: string) {
    return MunimClient.findAll({
      where: { company_id: companyId },
      include: [
        {
          model: User,
          as: 'munimUser',
          attributes: ['id', 'full_name', 'mobile', 'email'],
        },
        {
          model: User,
          as: 'requester',
          attributes: ['id', 'full_name', 'mobile'],
        },
      ],
      order: [['created_at', 'DESC']],
    });
  }

  async respondToRequest(requestId: string, user: any, dto: RespondMunimRequestDto) {
    const request = await MunimClient.findByPk(requestId);
    if (!request) {
      throw new NotFoundException(`Munim request with ID '${requestId}' not found`);
    }

    if (request.status !== MunimRequestStatus.PENDING && dto.status !== MunimRequestStatus.REVOKED) {
      throw new BadRequestException(`Request is already ${request.status}`);
    }

    // Authorization checks
    if (request.initiator_type === MunimInitiatorType.MUNIM_TO_COMPANY) {
      // Company Owner must respond
      const isCompanyAdmin = await UserCompanyRole.findOne({
        where: {
          user_id: user.id,
          company_id: request.company_id,
          role: Role.COMPANY_ADMIN,
          is_active: true,
        },
      });
      if (!isCompanyAdmin && !user.roles?.includes(Role.SUPER_ADMIN)) {
        throw new ForbiddenException('Only Company Owner can accept/reject this Munim request');
      }
    } else if (request.initiator_type === MunimInitiatorType.COMPANY_TO_MUNIM) {
      // Munim must respond
      if (request.munim_user_id !== user.id && !user.roles?.includes(Role.SUPER_ADMIN)) {
        throw new ForbiddenException('Only the invited Munim can accept/reject this request');
      }
    }

    await request.update({
      status: dto.status,
      responded_by_user_id: user.id,
    });

    return request;
  }

  async getApprovedCompanies(munimUserId: string) {
    const approvedClients = await MunimClient.findAll({
      where: {
        munim_user_id: munimUserId,
        status: MunimRequestStatus.ACCEPTED,
      },
      include: [
        {
          model: Company,
          as: 'company',
        },
      ],
    });

    return approvedClients.map((c) => ({
      relationshipId: c.id,
      company: c.company,
      permissions: c.permissions,
      joinedAt: c.updated_at,
    }));
  }

  async getConsolidatedDaybook(
    munimUserId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const approvedClients = await MunimClient.findAll({
      where: {
        munim_user_id: munimUserId,
        status: MunimRequestStatus.ACCEPTED,
      },
      attributes: ['company_id'],
    });

    const companyIds = approvedClients.map((c) => c.company_id);
    if (companyIds.length === 0) {
      return {
        summary: { totalCompanies: 0, totalSalesAmount: 0, totalUchapatAdvances: 0, totalShiftStitches: 0 },
        companiesData: [],
      };
    }

    const dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter[Op.between] = [startDate, endDate];
    }

    const companies = await Company.findAll({
      where: { id: { [Op.in]: companyIds } },
      include: [
        {
          model: OutwardInvoice,
          as: 'outwardInvoices',
          where: startDate && endDate ? { invoice_date: dateFilter } : undefined,
          required: false,
        },
        {
          model: DailyShiftLog,
          as: 'shiftLogs',
          where: startDate && endDate ? { shift_date: dateFilter } : undefined,
          required: false,
        },
        {
          model: KarigarUchapat,
          as: 'uchapatAdvances',
          where: startDate && endDate ? { date: dateFilter } : undefined,
          required: false,
        },
      ],
    });

    let totalSales = 0;
    let totalUchapat = 0;
    let totalStitches = 0;

    const companiesData = companies.map((comp) => {
      const compSales = (comp.outwardInvoices || []).reduce(
        (acc, inv) => acc + Number(inv.net_amount || 0),
        0,
      );
      const compUchapat = (comp.uchapatAdvances || []).reduce(
        (acc, u) => acc + Number(u.amount || 0),
        0,
      );
      const compStitches = (comp.shiftLogs || []).reduce(
        (acc, s) => acc + Number(s.total_stitches || 0),
        0,
      );

      totalSales += compSales;
      totalUchapat += compUchapat;
      totalStitches += compStitches;

      return {
        companyId: comp.id,
        companyName: comp.name,
        gstin: comp.gstin,
        invoicesCount: comp.outwardInvoices?.length || 0,
        totalSalesAmount: compSales,
        totalUchapatAmount: compUchapat,
        totalStitches: compStitches,
        shiftsCount: comp.shiftLogs?.length || 0,
      };
    });

    return {
      summary: {
        totalCompanies: companies.length,
        totalSalesAmount: totalSales,
        totalUchapatAdvances: totalUchapat,
        totalShiftStitches: totalStitches,
        period: { startDate, endDate },
      },
      companiesData,
    };
  }
}
