import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { UserCompanyRole } from '../../database/models/user-company-role.model';
import { MunimClient } from '../../database/models/munim-client.model';
import { MunimRequestStatus } from '../enums/munim-request-status.enum';
import { Role } from '../enums/role.enum';
import { COMPANY_ID_HEADER } from '../constants';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return true; // Let JwtAuthGuard handle unauthenticated
    }

    // Determine company ID
    const companyId =
      (request.headers[COMPANY_ID_HEADER] as string) ||
      request.query.company_id ||
      request.body?.company_id ||
      user.activeCompanyId;

    // Endpoints like profile, company-list, munim-requests don't require tenant context
    const isTenantOptional = this.reflector.getAllAndOverride<boolean>('tenantOptional', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!companyId) {
      if (isTenantOptional) {
        return true;
      }
      // If user has only one company, we can auto-resolve
      const userRoles = await UserCompanyRole.findAll({
        where: { user_id: user.id, is_active: true },
      });

      if (userRoles.length === 1) {
        request.companyId = userRoles[0].company_id;
        request.companyRole = userRoles[0].role;
        request.companyPermissions = userRoles[0].permissions || [];
        return true;
      }

      throw new BadRequestException(
        `Missing company context. Please supply '${COMPANY_ID_HEADER}' header or switch active company.`,
      );
    }

    // If user is SUPER_ADMIN
    if (user.roles?.includes(Role.SUPER_ADMIN)) {
      request.companyId = companyId;
      request.companyRole = Role.SUPER_ADMIN;
      request.companyPermissions = [];
      return true;
    }

    // 1. Check direct UserCompanyRole membership
    const userCompanyRole = await UserCompanyRole.findOne({
      where: {
        user_id: user.id,
        company_id: companyId,
        is_active: true,
      },
    });

    if (userCompanyRole) {
      request.companyId = companyId;
      request.companyRole = userCompanyRole.role;
      request.companyPermissions = userCompanyRole.permissions || [];
      return true;
    }

    // 2. Check Munim Client relationship (Accountant double handshake)
    const munimClient = await MunimClient.findOne({
      where: {
        munim_user_id: user.id,
        company_id: companyId,
        status: MunimRequestStatus.ACCEPTED,
      },
    });

    if (munimClient) {
      request.companyId = companyId;
      request.companyRole = Role.MUNIM;
      request.companyPermissions = munimClient.permissions || [];
      return true;
    }

    throw new ForbiddenException(
      `User does not have authorized access to company context '${companyId}'`,
    );
  }
}
