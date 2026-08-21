import { Module } from '@nestjs/common';
import { InwardChallansService } from './inward-challans.service';
import { InwardChallansController } from './inward-challans.controller';

@Module({
  controllers: [InwardChallansController],
  providers: [InwardChallansService],
  exports: [InwardChallansService],
})
export class InwardChallansModule {}
