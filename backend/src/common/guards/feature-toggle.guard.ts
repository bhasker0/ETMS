import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FEATURE_KEY } from '../decorators/feature.decorator';
import { Company } from '../../database/models/company.model';
import { COMPANY_ID_HEADER } from '../constants';
import { Role } from '../enums/role.enum';

@Injectable()
export class FeatureToggleGuard implements CanActivate {
  private readonly logger = new Logger(FeatureToggleGuard.name);

  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeature = this.reflector.getAllAndOverride<string>(FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredFeature) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const userRole: Role = request.companyRole || user?.role;

    // Super Admin has master bypass
    if (userRole === Role.SUPER_ADMIN || user?.isSuperAdmin || user?.roles?.includes(Role.SUPER_ADMIN)) {
      return true;
    }

    const companyId =
      request.headers?.[COMPANY_ID_HEADER.toLowerCase()] ||
      request.headers?.[COMPANY_ID_HEADER] ||
      request.companyId ||
      request.company?.id ||
      user?.activeCompanyId;

    let company = request.company;
    if (!company && companyId) {
      company = await Company.findByPk(companyId).catch(() => null);
    }

    if (!company) {
      return true;
    }

    const settings = company.settings || {};
    const toggles = {
      ...(settings.feature_toggles || {}),
      ...(settings.feature_flags || {}),
    };

    const cleanName = requiredFeature.replace(/^feature_/, '').replace(/_enabled$/, '');
    const candidates = [
      requiredFeature,
      `${requiredFeature}_enabled`,
      `feature_${requiredFeature}`,
      `feature_${requiredFeature}_enabled`,
      cleanName,
      `${cleanName}_enabled`,
      `feature_${cleanName}`,
      `feature_${cleanName}_enabled`,
    ];

    let isExplicitlyDisabled = false;
    for (const cand of candidates) {
      if (toggles[cand] === false || toggles[cand] === 'false' || toggles[cand] === 0 || toggles[cand] === '0') {
        isExplicitlyDisabled = true;
        break;
      }
      if (settings[cand] === false || settings[cand] === 'false' || settings[cand] === 0 || settings[cand] === '0') {
        isExplicitlyDisabled = true;
        break;
      }
    }

    if (isExplicitlyDisabled) {
      this.logger.warn(`Access blocked: Feature '${requiredFeature}' is disabled for company ${companyId}`);
      throw new ForbiddenException(
        `You do not have authority for this functionality. This feature '${requiredFeature}' is disabled in your company subscription. Please contact Super Admin.`,
      );
    }

    return true;
  }
}
