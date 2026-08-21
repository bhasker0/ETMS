import { Module } from '@nestjs/common';
import { ShiftLogsService } from './shift-logs.service';
import { ShiftLogsController } from './shift-logs.controller';

@Module({
  controllers: [ShiftLogsController],
  providers: [ShiftLogsService],
  exports: [ShiftLogsService],
})
export class ShiftLogsModule {}
