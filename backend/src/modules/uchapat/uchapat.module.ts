import { Module } from '@nestjs/common';
import { UchapatService } from './uchapat.service';
import { UchapatController } from './uchapat.controller';

@Module({
  controllers: [UchapatController],
  providers: [UchapatService],
  exports: [UchapatService],
})
export class UchapatModule {}
