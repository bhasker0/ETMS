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
    const companyId = request.headers[COMPANY_ID_HEADER.toLowerCase()] || request.companyId;

    if (!companyId) {
      return true;
    }

    const company = await Company.findByPk(companyId);
    if (!company) {
      return true;
    }

    const toggles = company.settings?.feature_toggles || {};
    const keyName = `${requiredFeature}_enabled`;
    const isEnabled = toggles[keyName] !== false; // Default to true unless explicitly disabled

    if (!isEnabled) {
      this.logger.warn(`Access blocked: Feature '${requiredFeature}' is disabled for company ${companyId}`);
      throw new ForbiddenException(`Module feature '${requiredFeature}' is disabled by SaaS Super Admin.`);
    }

    return true;
  }
}
