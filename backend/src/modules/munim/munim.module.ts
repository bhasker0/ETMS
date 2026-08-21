import { Module } from '@nestjs/common';
import { MunimService } from './munim.service';
import { MunimController } from './munim.controller';

@Module({
  controllers: [MunimController],
  providers: [MunimService],
  exports: [MunimService],
})
export class MunimModule {}
