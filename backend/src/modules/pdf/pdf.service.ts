import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { generateInvoiceHtml } from './templates/invoice.template';
import { generateHisabHtml } from './templates/hisab.template';
import { generateChallanHtml } from './templates/challan.template';
import { generateLedgerHtml } from './templates/ledger.template';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);
  private readonly pdfServiceUrl: string;

  constructor() {
    this.pdfServiceUrl = process.env.PDF_SERVICE_URL || 'http://pdf-service:3001';
  }

  async generatePdfFromHtml(
    html: string,
    options: {
      landscape?: boolean;
      format?: string;
      margin?: any;
      displayHeaderFooter?: boolean;
      headerTemplate?: string;
      footerTemplate?: string;
    } = {},
  ): Promise<Buffer> {
    try {
      const response = await axios.post(
        `${this.pdfServiceUrl}/generate-pdf`,
        {
          html,
          landscape: options.landscape || false,
          format: options.format || 'A4',
          margin: options.margin,
          displayHeaderFooter: options.displayHeaderFooter,
          headerTemplate: options.headerTemplate,
          footerTemplate: options.footerTemplate,
        },
        {
          responseType: 'arraybuffer',
          timeout: 30000,
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
    const invoiceNo = data.invoice?.invoice_no || '';
    return this.generatePdfFromHtml(html, {
      format: 'A4',
      landscape: false,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="font-size: 7.2pt; font-family: Arial, sans-serif; width: 100%; display: flex; justify-content: space-between; padding: 0 6mm; color: #555; border-top: 0.5px solid #ccc; padding-top: 2px;">
          <span>GST SAC 9988 Tax Invoice ${invoiceNo ? '• ' + invoiceNo : ''}</span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `.trim(),
      margin: {
        top: '6mm',
        right: '5mm',
        bottom: '12mm',
        left: '5mm',
      },
    });
  }

  async generateHisabPdf(data: any): Promise<Buffer> {
    const html = generateHisabHtml(data);
    const karigarName = data.karigar?.name || '';
    const period = data.hisabPeriod ? `${data.hisabPeriod.startDate} to ${data.hisabPeriod.endDate}` : '';
    return this.generatePdfFromHtml(html, {
      format: 'A4',
      landscape: false,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="font-size: 7.2pt; font-family: Arial, sans-serif; width: 100%; display: flex; justify-content: space-between; padding: 0 8mm; color: #555; border-top: 0.5px solid #ccc; padding-top: 2px;">
          <span>Karigar Wage Hisab Slip ${karigarName ? '• ' + karigarName : ''} ${period ? '• ' + period : ''}</span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `.trim(),
      margin: {
        top: '6mm',
        right: '6mm',
        bottom: '12mm',
        left: '6mm',
      },
    });
  }

  async generateChallanPdf(data: any): Promise<Buffer> {
    const html = generateChallanHtml(data);
    const challanNo = data.challan?.challan_no || '';
    return this.generatePdfFromHtml(html, {
      format: 'A4',
      landscape: false,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="font-size: 7.2pt; font-family: Arial, sans-serif; width: 100%; display: flex; justify-content: space-between; padding: 0 6mm; color: #555; border-top: 0.5px solid #ccc; padding-top: 2px;">
          <span>Inward Delivery Challan (Rule 55) ${challanNo ? '• ' + challanNo : ''}</span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `.trim(),
      margin: {
        top: '6mm',
        right: '5mm',
        bottom: '12mm',
        left: '5mm',
      },
    });
  }

  async generateLedgerPdf(data: any): Promise<Buffer> {
    const html = generateLedgerHtml(data);
    const partyName = data.party?.name || 'Party';
    return this.generatePdfFromHtml(html, {
      format: 'A4',
      landscape: false,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="font-size: 7.2pt; font-family: Arial, sans-serif; width: 100%; display: flex; justify-content: space-between; padding: 0 6mm; color: #555; border-top: 0.5px solid #ccc; padding-top: 2px;">
          <span>Party Statement of Account • ${partyName}</span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `.trim(),
      margin: {
        top: '6mm',
        right: '5mm',
        bottom: '12mm',
        left: '5mm',
      },
    });
  }
}
