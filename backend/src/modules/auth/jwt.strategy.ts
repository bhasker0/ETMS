import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { User } from '../../database/models/user.model';
import { UserCompanyRole } from '../../database/models/user-company-role.model';
import { Company } from '../../database/models/company.model';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'surat_embroidery_super_secret_jwt_key_2026',
    });
  }

  async validate(payload: any) {
    const user = await User.findByPk(payload.sub, {
      attributes: ['id', 'full_name', 'mobile', 'email', 'status'],
      include: [
        {
          model: UserCompanyRole,
          as: 'userCompanyRoles',
          include: [{ model: Company, as: 'company', attributes: ['id', 'name', 'gstin'] }],
        },
      ],
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User not found or account is deactivated');
    }

    return {
      id: user.id,
      fullName: user.full_name,
      mobile: user.mobile,
      email: user.email,
      roles: user.userCompanyRoles?.map((r) => r.role) || [],
      activeCompanyId: payload.companyId || null,
      companies: user.userCompanyRoles?.map((r) => ({
        companyId: r.company_id,
        companyName: r.company?.name,
        role: r.role,
        permissions: r.permissions,
      })) || [],
    };
  }
}
