import { Module } from '@nestjs/common';
import { OutwardInvoicesService } from './outward-invoices.service';
import { OutwardInvoicesController } from './outward-invoices.controller';

@Module({
  controllers: [OutwardInvoicesController],
  providers: [OutwardInvoicesService],
  exports: [OutwardInvoicesService],
})
export class OutwardInvoicesModule {}
