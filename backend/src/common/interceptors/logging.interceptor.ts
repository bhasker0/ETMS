import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { CORRELATION_ID_HEADER } from '../constants';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const { method, originalUrl, ip } = req;
    const correlationId = (req.headers[CORRELATION_ID_HEADER] as string) || req[CORRELATION_ID_HEADER];
    const companyId = req.companyId || (req.headers['x-company-id'] as string) || null;
    const userId = (req.user as any)?.id || null;

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const executionTimeMs = Date.now() - startTime;
          const statusCode = res.statusCode;

          this.logger.log({
            message: `${method} ${originalUrl} ${statusCode} - ${executionTimeMs}ms`,
            method,
            url: originalUrl,
            statusCode,
            executionTimeMs,
            company_id: companyId,
            user_id: userId,
            ip,
            correlation_id: correlationId,
          });
        },
        error: (err) => {
          const executionTimeMs = Date.now() - startTime;
          const statusCode = err.status || 500;

          this.logger.error({
            message: `${method} ${originalUrl} ${statusCode} - ${executionTimeMs}ms - Error: ${err.message}`,
            method,
            url: originalUrl,
            statusCode,
            executionTimeMs,
            company_id: companyId,
            user_id: userId,
            ip,
            correlation_id: correlationId,
            stack: err.stack,
          });
        },
      }),
    );
  }
}
