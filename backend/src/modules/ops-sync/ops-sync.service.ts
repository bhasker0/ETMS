import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { Company } from '../../database/models/company.model';
import { User } from '../../database/models/user.model';
import { UserCompanyRole } from '../../database/models/user-company-role.model';
import { Role } from '../../common/enums/role.enum';
import { Permission } from '../../common/enums/permission.enum';

@Injectable()
export class OpsSyncService {
  private readonly logger = new Logger(OpsSyncService.name);
  private readonly syncSecret = process.env.JWT_SECRET || 'surat_embroidery_super_secret_jwt_key_2026';

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
    const { id, full_name, mobile, email, company_id, role, is_internal_ops } = payload;
    this.logger.log(`Syncing user ${full_name} (${mobile}) from OPS`);

    const [user, created] = await User.findOrCreate({
      where: { mobile },
      defaults: {
        id,
        full_name,
        mobile,
        email,
        password_hash: 'Password@123',
        status: 'ACTIVE',
        is_internal_ops: !!is_internal_ops,
      } as any,
    });

    if (!created) {
      user.full_name = full_name || user.full_name;
      user.email = email || user.email;
      user.is_internal_ops = !!is_internal_ops;
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
    const { company_id, parameters } = payload;
    this.logger.log(`Syncing parameters for company ${company_id} from OPS`);

    const company = await Company.findByPk(company_id);
    if (!company) {
      return { success: false, message: 'Company not found' };
    }

    const currentSettings = company.settings || {};
    company.settings = {
      ...currentSettings,
      ...(parameters || {}),
    };
    await company.save();

    return { success: true, companyId: company.id, settings: company.settings };
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

    return { success: true, companyId: company.id, status: company.status };
  }
}
