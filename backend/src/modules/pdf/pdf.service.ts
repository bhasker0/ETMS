import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { generateInvoiceHtml } from './templates/invoice.template';
import { generateHisabHtml } from './templates/hisab.template';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);
  private readonly pdfServiceUrl: string;

  constructor() {
    this.pdfServiceUrl = process.env.PDF_SERVICE_URL || 'http://pdf-service:3001';
  }

  async generatePdfFromHtml(
    html: string,
    options: { landscape?: boolean; format?: string } = {},
  ): Promise<Buffer> {
    try {
      const response = await axios.post(
        `${this.pdfServiceUrl}/generate-pdf`,
        {
          html,
          landscape: options.landscape || false,
          format: options.format || 'A4',
        },
        {
          responseType: 'arraybuffer',
          timeout: 20000,
        },
      );

      return Buffer.from(response.data);
    } catch (err) {
      this.logger.error(`PDF generation error via microservice: ${err.message}`, err.stack);
      throw new Error(`Failed to generate PDF via microservice: ${err.message}`);
    }
  }

  async generateInvoicePdf(data: any): Promise<Buffer> {
    const html = generateInvoiceHtml(data);
    return this.generatePdfFromHtml(html);
  }

  async generateHisabPdf(data: any): Promise<Buffer> {
    const html = generateHisabHtml(data);
    return this.generatePdfFromHtml(html);
  }
}
