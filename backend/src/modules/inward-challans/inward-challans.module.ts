import { Module } from '@nestjs/common';
import { InwardChallansService } from './inward-challans.service';
import { InwardChallansController } from './inward-challans.controller';
import { PdfModule } from '../pdf/pdf.module';

@Module({
  imports: [PdfModule],
  controllers: [InwardChallansController],
  providers: [InwardChallansService],
  exports: [InwardChallansService],
})
export class InwardChallansModule {}
