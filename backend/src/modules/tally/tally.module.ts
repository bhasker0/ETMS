import { Module } from '@nestjs/common';
import { TallyService } from './tally.service';
import { TallyController } from './tally.controller';

@Module({
  controllers: [TallyController],
  providers: [TallyService],
  exports: [TallyService],
})
export class TallyModule {}
