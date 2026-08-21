import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { COMPANY_ID_HEADER } from '../constants';

declare global {
  namespace Express {
    interface Request {
      companyId?: string;
      correlationId?: string;
      [key: string]: any;
    }
  }
}

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const companyIdHeader = req.headers[COMPANY_ID_HEADER] as string;
    if (companyIdHeader) {
      req.companyId = companyIdHeader;
    }
    next();
  }
}
