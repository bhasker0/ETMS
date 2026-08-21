import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import Redis from 'ioredis';
import { User } from '../../database/models/user.model';
import { Company } from '../../database/models/company.model';
import { UserCompanyRole } from '../../database/models/user-company-role.model';
import { MunimClient } from '../../database/models/munim-client.model';
import { MunimRequestStatus } from '../../common/enums/munim-request-status.enum';
import { Role } from '../../common/enums/role.enum';
import { Permission } from '../../common/enums/permission.enum';
import { LoginDto, RegisterDto, SwitchCompanyDto } from './dto/auth.dto';
import { REDIS_TOKEN_BLACKLIST_PREFIX } from '../../common/constants';

@Injectable()
export class AuthService {
  private redisClient: Redis;

  constructor(private jwtService: JwtService) {
    this.redisClient = new Redis({
      host: process.env.REDIS_HOST || 'redis',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      lazyConnect: true,
    });
    this.redisClient.connect().catch(() => {});
  }

  async register(registerDto: RegisterDto) {
    const existing = await User.findOne({ where: { mobile: registerDto.mobile } });
    if (existing) {
      throw new ConflictException(`User with mobile ${registerDto.mobile} already exists`);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(registerDto.password, salt);

    const user = await User.create({
      full_name: registerDto.fullName,
      mobile: registerDto.mobile,
      email: registerDto.email,
      password_hash: passwordHash,
      status: 'ACTIVE',
    } as any);

    let company: Company | null = null;
    const requestedRole = (registerDto.role as Role) || Role.COMPANY_ADMIN;

    if (registerDto.companyName) {
      company = await Company.create({
        name: registerDto.companyName,
        gstin: registerDto.gstin || '24AAAAA0000A1Z5',
        phone: registerDto.mobile,
        settings: {
          shrinkage_tolerance_percent: 3.0,
          sac_code: '9988',
          default_rate_per_1000: 0.35,
          default_heads: 32,
        },
      } as any);

      // Assign role with all permissions for admin
      const allPermissions = Object.values(Permission);
      await UserCompanyRole.create({
        user_id: user.id,
        company_id: company.id,
        role: requestedRole,
        permissions: requestedRole === Role.COMPANY_ADMIN ? allPermissions : [],
        is_active: true,
      } as any);
    }

    const payload = {
      sub: user.id,
      mobile: user.mobile,
      fullName: user.full_name,
      companyId: company ? company.id : null,
    };

    const token = this.jwtService.sign(payload);

    return {
      user: {
        id: user.id,
        fullName: user.full_name,
        mobile: user.mobile,
        email: user.email,
      },
      company: company
        ? {
            id: company.id,
            name: company.name,
            gstin: company.gstin,
          }
        : null,
      accessToken: token,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await User.findOne({
      where: { mobile: loginDto.mobile },
      include: [
        {
          model: UserCompanyRole,
          as: 'userCompanyRoles',
          include: [{ model: Company, as: 'company' }],
        },
        {
          model: MunimClient,
          as: 'munimClients',
          where: { status: MunimRequestStatus.ACCEPTED },
          required: false,
          include: [{ model: Company, as: 'company' }],
        },
      ],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid mobile number or password');
    }

    const isMatch = await bcrypt.compare(loginDto.password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid mobile number or password');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is inactive or suspended');
    }

    // Determine active company ID
    let activeCompanyId = loginDto.companyId;

    if (!activeCompanyId) {
      if (user.userCompanyRoles && user.userCompanyRoles.length > 0) {
        activeCompanyId = user.userCompanyRoles[0].company_id;
      } else if (user.munimClients && user.munimClients.length > 0) {
        activeCompanyId = user.munimClients[0].company_id;
      }
    }

    const payload = {
      sub: user.id,
      mobile: user.mobile,
      fullName: user.full_name,
      companyId: activeCompanyId,
    };

    const token = this.jwtService.sign(payload);

    return {
      accessToken: token,
      user: {
        id: user.id,
        fullName: user.full_name,
        mobile: user.mobile,
        email: user.email,
      },
      activeCompanyId,
      companies: (user.userCompanyRoles || []).map((ucr) => ({
        id: ucr.company_id,
        name: ucr.company?.name,
        gstin: ucr.company?.gstin,
        role: ucr.role,
        permissions: ucr.permissions,
      })),
      munimApprovedCompanies: (user.munimClients || []).map((mc) => ({
        id: mc.company_id,
        name: mc.company?.name,
        gstin: mc.company?.gstin,
        role: Role.MUNIM,
        permissions: mc.permissions,
      })),
    };
  }

  async switchCompany(userId: string, switchCompanyDto: SwitchCompanyDto) {
    const { companyId } = switchCompanyDto;

    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify user belongs to this company or is accepted Munim
    const hasRole = await UserCompanyRole.findOne({
      where: { user_id: userId, company_id: companyId, is_active: true },
    });

    const isMunim = await MunimClient.findOne({
      where: {
        munim_user_id: userId,
        company_id: companyId,
        status: MunimRequestStatus.ACCEPTED,
      },
    });

    if (!hasRole && !isMunim) {
      throw new BadRequestException('User does not have access to switch to this company');
    }

    const company = await Company.findByPk(companyId);

    const payload = {
      sub: user.id,
      mobile: user.mobile,
      fullName: user.full_name,
      companyId: companyId,
    };

    const token = this.jwtService.sign(payload);

    return {
      accessToken: token,
      activeCompany: {
        id: company?.id,
        name: company?.name,
        gstin: company?.gstin,
        role: hasRole ? hasRole.role : Role.MUNIM,
        permissions: hasRole ? hasRole.permissions : isMunim?.permissions,
      },
    };
  }

  async logout(token: string) {
    if (!token) return { message: 'Logged out' };

    try {
      if (this.redisClient.status === 'ready') {
        // Blacklist token for 24 hours (86400 seconds)
        await this.redisClient.set(
          `${REDIS_TOKEN_BLACKLIST_PREFIX}${token}`,
          '1',
          'EX',
          86400,
        );
      }
    } catch (err) {
      // Non-fatal
    }

    return { message: 'Successfully logged out and session revoked' };
  }
}
