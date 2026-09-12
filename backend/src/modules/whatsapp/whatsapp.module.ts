import { Module, forwardRef } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';
import { PdfModule } from '../pdf/pdf.module';
import { PartiesModule } from '../parties/parties.module';

@Module({
  imports: [PdfModule, forwardRef(() => PartiesModule)],
  controllers: [WhatsappController],
  providers: [WhatsappService],
  exports: [WhatsappService],
})
export class WhatsappModule {}
