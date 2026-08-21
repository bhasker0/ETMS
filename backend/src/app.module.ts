import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';

import { DatabaseModule } from './database/database.module';
import { PdfModule } from './modules/pdf/pdf.module';
import { AuthModule } from './modules/auth/auth.module';
import { CompanyModule } from './modules/company/company.module';
import { MunimModule } from './modules/munim/munim.module';
import { MachinesModule } from './modules/machines/machines.module';
import { KarigarsModule } from './modules/karigars/karigars.module';
import { UchapatModule } from './modules/uchapat/uchapat.module';
import { InwardChallansModule } from './modules/inward-challans/inward-challans.module';
import { ShiftLogsModule } from './modules/shift-logs/shift-logs.module';
import { OutwardInvoicesModule } from './modules/outward-invoices/outward-invoices.module';
import { WageHisabModule } from './modules/wage-hisab/wage-hisab.module';
import { TallyModule } from './modules/tally/tally.module';
import { AuditModule } from './modules/audit/audit.module';

import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { TenantContextMiddleware } from './common/middleware/tenant-context.middleware';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    PdfModule,
    AuthModule,
    CompanyModule,
    MunimModule,
    MachinesModule,
    KarigarsModule,
    UchapatModule,
    InwardChallansModule,
    ShiftLogsModule,
    OutwardInvoicesModule,
    WageHisabModule,
    TallyModule,
    AuditModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorrelationIdMiddleware, TenantContextMiddleware)
      .forRoutes('*');
  }
}
