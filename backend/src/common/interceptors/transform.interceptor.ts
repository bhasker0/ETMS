import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';
import { ApiResponse } from '../dto/api-response.dto';
import { CORRELATION_ID_HEADER } from '../constants';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const req = context.switchToHttp().getRequest<Request>();
    const correlationId = (req.headers[CORRELATION_ID_HEADER] as string) || req[CORRELATION_ID_HEADER];

    return next.handle().pipe(
      map((data) => {
        // If response is a Stream or Buffer (e.g. PDF or XML download), don't transform
        if (data instanceof Buffer || typeof data?.pipe === 'function') {
          return data;
        }

        // If response already has custom format
        if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
          return {
            ...data,
            correlationId,
            timestamp: new Date().toISOString(),
          };
        }

        const isPaginated = data && typeof data === 'object' && 'rows' in data && 'count' in data;

        if (isPaginated) {
          return {
            success: true,
            data: data.rows,
            meta: {
              total: data.count,
              page: Number(req.query?.page) || 1,
              limit: Number(req.query?.limit) || 20,
              totalPages: Math.ceil(data.count / (Number(req.query?.limit) || 20)),
            },
            correlationId,
            timestamp: new Date().toISOString(),
          };
        }

        return {
          success: true,
          data,
          correlationId,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
