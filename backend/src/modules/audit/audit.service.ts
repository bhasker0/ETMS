import { Injectable } from '@nestjs/common';
import { Op } from 'sequelize';
import { AuditLog } from '../../database/models/audit-log.model';

@Injectable()
export class AuditService {
  async getAuditLogs(
    companyId: string,
    options: {
      entity_type?: string;
      action?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
    } = {},
  ) {
    const where: any = { company_id: companyId };

    if (options.entity_type) where.entity_type = options.entity_type;
    if (options.action) where.action = options.action;
    if (options.startDate && options.endDate) {
      where.created_at = { [Op.between]: [options.startDate, options.endDate] };
    }

    return AuditLog.findAll({
      where,
      limit: options.limit || 50,
      order: [['created_at', 'DESC']],
    });
  }
}
