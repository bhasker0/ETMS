import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { AuditLog } from '../../database/models/audit-log.model';
import { CORRELATION_ID_HEADER } from '../constants';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const method = req.method.toUpperCase();

    // Only audit mutating operations on financial endpoints
    const financialRoutes = ['outward-invoices', 'inward-challans', 'uchapat', 'wage-hisab'];
    const isFinancialRoute = financialRoutes.some((route) => req.originalUrl.includes(route));

    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) || !isFinancialRoute) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: async (resData) => {
          try {
            const correlationId =
              (req.headers[CORRELATION_ID_HEADER] as string) || req[CORRELATION_ID_HEADER];
            const entityType = this.determineEntityType(req.originalUrl);
            const entityId = resData?.data?.id || req.params?.id || 'unknown';

            let action = 'CREATE';
            if (method === 'PUT' || method === 'PATCH') action = 'UPDATE';
            if (method === 'DELETE') action = 'DELETE';

            await AuditLog.create({
              company_id: req.companyId || null,
              user_id: (req.user as any)?.id || null,
              entity_type: entityType,
              entity_id: String(entityId),
              action,
              old_values: method === 'DELETE' ? req.params : null,
              new_values: method !== 'DELETE' ? req.body : null,
              ip_address: req.ip || req.socket.remoteAddress,
              correlation_id: correlationId,
            } as any);
          } catch (err) {
            console.error('AuditLog creation error:', err.message);
          }
        },
      }),
    );
  }

  private determineEntityType(url: string): string {
    if (url.includes('outward-invoices')) return 'OutwardInvoice';
    if (url.includes('inward-challans')) return 'InwardChallan';
    if (url.includes('uchapat')) return 'KarigarUchapat';
    if (url.includes('wage-hisab')) return 'KarigarWageHisab';
    return 'FinancialEntity';
  }
}
