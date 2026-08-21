import { Module } from '@nestjs/common';
import { KarigarsService } from './karigars.service';
import { KarigarsController } from './karigars.controller';

@Module({
  controllers: [KarigarsController],
  providers: [KarigarsService],
  exports: [KarigarsService],
})
export class KarigarsModule {}
