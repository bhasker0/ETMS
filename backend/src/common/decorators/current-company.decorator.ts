import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentCompanyId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    const headerCompanyId = request.headers['x-company-id'];
    const validHeaderId =
      headerCompanyId && headerCompanyId !== 'undefined' && headerCompanyId !== 'null'
        ? headerCompanyId
        : undefined;
    return request.companyId || validHeaderId || request.user?.companyId || request.user?.activeCompanyId;
  },
);
