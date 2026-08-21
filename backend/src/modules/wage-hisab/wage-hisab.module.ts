import { Module } from '@nestjs/common';
import { WageHisabService } from './wage-hisab.service';
import { WageHisabController } from './wage-hisab.controller';

@Module({
  controllers: [WageHisabController],
  providers: [WageHisabService],
  exports: [WageHisabService],
})
export class WageHisabModule {}
