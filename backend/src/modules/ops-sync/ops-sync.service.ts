import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { Subject, Observable } from 'rxjs';
import { Company } from '../../database/models/company.model';
import { User } from '../../database/models/user.model';
import { UserCompanyRole } from '../../database/models/user-company-role.model';
import { Role } from '../../common/enums/role.enum';
import { Permission } from '../../common/enums/permission.enum';
import * as bcrypt from 'bcrypt';

export interface OpsSyncEvent {
  data: {
    type: 'PARAMETER_UPDATED' | 'FEATURE_FLAG_UPDATED' | 'SUBSCRIPTION_UPDATED' | 'COMPANY_UPDATED';
    company_id: string;
    key?: string;
    value?: any;
    enabled?: boolean;
    parameters?: Record<string, any>;
    feature_flags?: Record<string, boolean>;
    timestamp: string;
  };
}

@Injectable()
export class OpsSyncService {
  private readonly logger = new Logger(OpsSyncService.name);
  private readonly syncSecret = process.env.JWT_SECRET || 'surat_embroidery_super_secret_jwt_key_2026';
  private syncEvents$ = new Subject<OpsSyncEvent>();

  getSyncEventsObservable(): Observable<OpsSyncEvent> {
    return this.syncEvents$.asObservable();
  }

  emitSyncEvent(event: OpsSyncEvent['data']) {
    this.logger.log(`Broadcasting realtime sync event: ${event.type} for company ${event.company_id}`);
    this.syncEvents$.next({ data: event });
  }

  verifySignature(payload: any, signature: string): boolean {
    if (!signature) return false;
    const bodyString = JSON.stringify(payload);
    const expected = crypto.createHmac('sha256', this.syncSecret).update(bodyString).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  }

  // SCRUM-53: Provision / Sync Company
  async syncCompany(payload: any) {
    const { id, name, gstin, address, phone, status, settings, feature_toggles } = payload;
    this.logger.log(`Syncing company ${name} (${id}) from OPS`);

    const mergedSettings = {
      ...(settings || {}),
      feature_toggles: feature_toggles || {
        tally_export_enabled: true,
        munim_portal_enabled: true,
        voice_logger_enabled: true,
        thermal_printing_enabled: true,
        uchapat_advance_enabled: true,
      },
    };

    const [company, created] = await Company.findOrCreate({
      where: { id },
      defaults: {
        id,
        name,
        gstin: gstin || '24AAAAA0000A1Z0',
        address: address || 'Surat GIDC Cluster, Gujarat',
        phone: phone || '9825000000',
        status: status || 'ACTIVE',
        settings: mergedSettings,
      } as any,
    });

    if (!created) {
      company.name = name || company.name;
      company.gstin = gstin || company.gstin;
      company.address = address || company.address;
      company.phone = phone || company.phone;
      if (status) company.status = status;
      company.settings = { ...(company.settings || {}), ...mergedSettings };
      await company.save();
    }

    return { success: true, companyId: company.id, created };
  }

  // SCRUM-54: Sync User & Roles
  async syncUser(payload: any) {
    const { id, full_name, mobile, email, company_id, role, is_internal_ops, password_hash, password } = payload;
    this.logger.log(`Syncing user ${full_name} (${mobile}) from OPS`);

    let finalPasswordHash = password_hash;
    if (!finalPasswordHash || !finalPasswordHash.startsWith('$2')) {
      finalPasswordHash = await bcrypt.hash(password || password_hash || 'Password@123', 10);
    }

    const [user, created] = await User.findOrCreate({
      where: { mobile },
      defaults: {
        id,
        full_name,
        mobile,
        email,
        password_hash: finalPasswordHash,
        status: 'ACTIVE',
        is_internal_ops: !!is_internal_ops,
      } as any,
    });

    if (!created) {
      user.full_name = full_name || user.full_name;
      user.email = email || user.email;
      user.is_internal_ops = !!is_internal_ops;
      if (!user.password_hash || !user.password_hash.startsWith('$2') || user.password_hash === 'Password@123') {
        user.password_hash = finalPasswordHash;
      }
      await user.save();
    }

    if (company_id) {
      const allPermissions = Object.values(Permission);
      await UserCompanyRole.findOrCreate({
        where: { user_id: user.id, company_id },
        defaults: {
          user_id: user.id,
          company_id,
          role: role || Role.COMPANY_ADMIN,
          permissions: allPermissions,
          is_active: true,
        } as any,
      });
    }

    return { success: true, userId: user.id, created };
  }

  // SCRUM-55: Sync Operational Parameters
  async syncParameters(payload: any) {
    const { company_id, parameters, settings } = payload;
    this.logger.log(`Syncing parameters for company ${company_id} from OPS`);

    let company = await Company.findByPk(company_id);
    if (!company) {
      company = await Company.findOne({
        where: { name: 'Radhe Krishna Embroidery Works' },
      });
      if (!company) {
        return { success: false, message: 'Company not found' };
      }
    }

    const currentSettings = company.settings || {};
    const currentToggles = currentSettings.feature_toggles || {};
    const incoming = { ...(parameters || {}), ...(settings || {}) };

    const updatedToggles = { ...currentToggles };
    for (const [k, v] of Object.entries(incoming)) {
      if (k.startsWith('feature_') || k.endsWith('_enabled')) {
        const boolVal = v === true || v === 'true' || v === 1 || v === '1';
        const cleanKey = k.replace(/^feature_/, '').replace(/_enabled$/, '');
        updatedToggles[k] = boolVal;
        updatedToggles[`feature_${cleanKey}`] = boolVal;
        updatedToggles[`${cleanKey}_enabled`] = boolVal;
        updatedToggles[cleanKey] = boolVal;
      }
    }

    company.settings = {
      ...currentSettings,
      ...incoming,
      feature_toggles: updatedToggles,
    };
    await company.save();

    this.emitSyncEvent({
      type: 'PARAMETER_UPDATED',
      company_id: company.id,
      parameters: incoming,
      feature_flags: company.settings.feature_toggles,
      timestamp: new Date().toISOString(),
    });

    return { success: true, companyId: company.id, settings: company.settings };
  }

  // SCRUM-331: Sync Feature Flags from OPS
  async syncFeatureFlags(payload: any) {
    const { company_id, flagKey, enabled, feature_flags } = payload;
    this.logger.log(`Syncing feature flags for company ${company_id} from OPS`);

    let company = await Company.findByPk(company_id);
    if (!company) {
      company = await Company.findOne({
        where: { name: 'Radhe Krishna Embroidery Works' },
      });
      if (!company) {
        return { success: false, message: 'Company not found' };
      }
    }

    const currentSettings = company.settings || {};
    const currentToggles = currentSettings.feature_toggles || {};
    const boolVal = enabled === true || enabled === 'true' || enabled === 1 || enabled === '1';

    if (feature_flags) {
      company.settings = {
        ...currentSettings,
        feature_toggles: { ...currentToggles, ...feature_flags },
      };
    } else if (flagKey) {
      const cleanKey = flagKey.replace(/^feature_/, '').replace(/_enabled$/, '');
      company.settings = {
        ...currentSettings,
        [flagKey]: boolVal ? 'true' : 'false',
        feature_toggles: {
          ...currentToggles,
          [flagKey]: boolVal,
          [`${flagKey}_enabled`]: boolVal,
          [cleanKey]: boolVal,
          [`${cleanKey}_enabled`]: boolVal,
        },
      };
    }
    await company.save();

    this.emitSyncEvent({
      type: 'FEATURE_FLAG_UPDATED',
      company_id: company.id,
      key: flagKey,
      enabled: boolVal,
      feature_flags: company.settings.feature_toggles,
      timestamp: new Date().toISOString(),
    });

    return { success: true, companyId: company.id, feature_toggles: company.settings.feature_toggles };
  }

  // SCRUM-57: Subscription Status & Access Suspension
  async syncSubscriptionStatus(payload: any) {
    const { company_id, status } = payload;
    this.logger.log(`Syncing subscription status for company ${company_id}: ${status}`);

    const company = await Company.findByPk(company_id);
    if (!company) {
      return { success: false, message: 'Company not found' };
    }

    company.status = status;
    await company.save();

    this.emitSyncEvent({
      type: 'SUBSCRIPTION_UPDATED',
      company_id: company.id,
      value: status,
      timestamp: new Date().toISOString(),
    });

    return { success: true, companyId: company.id, status: company.status };
  }
}
