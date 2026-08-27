import { Module } from '@nestjs/common';
import { OpsSyncController } from './ops-sync.controller';
import { OpsSyncService } from './ops-sync.service';

@Module({
  controllers: [OpsSyncController],
  providers: [OpsSyncService],
  exports: [OpsSyncService],
})
export class OpsSyncModule {}
