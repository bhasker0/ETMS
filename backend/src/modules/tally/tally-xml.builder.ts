import { create } from 'xmlbuilder2';

export interface TallyVoucherInput {
  guid: string;
  invoice_no: string;
  invoice_date: string; // YYYY-MM-DD
  trader_name: string;
  trader_gstin?: string;
  sac_code: string;
  machine_heads: number;
  total_stitches: number;
  rate_per_1000: number;
  gross_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  net_amount: number;
  inward_meters: number;
  outward_meters: number;
  challan_no?: string;
  lot_no?: string;
}

export function buildTallyPrimeXml(companyName: string, vouchers: TallyVoucherInput[]): string {
  const root = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('ENVELOPE')
    .ele('HEADER')
    .ele('TALLYREQUEST').txt('Import Data').up()
    .up()
    .ele('BODY')
    .ele('IMPORTDATA')
    .ele('REQUESTDESC')
    .ele('REPORTNAME').txt('Vouchers').up()
    .ele('STATICVARIABLES')
    .ele('SVCURRENTCOMPANY').txt(companyName).up()
    .up()
    .up()
    .ele('REQUESTDATA');

  for (const v of vouchers) {
    const tallyDate = v.invoice_date.replace(/-/g, ''); // YYYYMMDD
    const isIntraState = v.igst_amount <= 0;

    const tallyMessage = root.ele('TALLYMESSAGE', { 'xmlns:UDF': 'TallyUDF' });
    const voucher = tallyMessage
      .ele('VOUCHER', {
        VCHTYPE: 'Sales',
        ACTION: 'Create',
        OBJVIEW: 'Invoice Voucher View',
      })
      .ele('DATE').txt(tallyDate).up()
      .ele('GUID').txt(v.guid || `ETMS-INV-${v.invoice_no}`).up()
      .ele('VOUCHERTYPENAME').txt('Sales').up()
      .ele('VOUCHERNUMBER').txt(v.invoice_no).up()
      .ele('PARTYLEDGERNAME').txt(v.trader_name).up()
      .ele('CSTFORMISSUETYPE').up()
      .ele('CSTFORMRECVTYPE').up()
      .ele('FBTPAYMENTTYPE').txt('Default').up()
      .ele('PERSISTEDVIEW').txt('Invoice Voucher View').up()
      .ele('PLACEOFSUPPLY').txt('Gujarat').up()
      .ele('ISINVOICE').txt('Yes').up()
      .ele('NARRATION')
      .txt(
        `Surat Job-Work SAC 9988 | Ref Challan: ${v.challan_no || 'N/A'}, Lot: ${v.lot_no || 'N/A'}, Stitches: ${v.total_stitches}, Heads: ${v.machine_heads}, Rate/1k: ${v.rate_per_1000}, Outward: ${v.outward_meters}m`,
      )
      .up();

    // 1. Party / Debtor Ledger Allocation (Debit - Positive Net Amount)
    voucher
      .ele('ALLLEDGERENTRIES.LIST')
      .ele('LEDGERNAME').txt(v.trader_name).up()
      .ele('ISDEEMEDPOSITIVE').txt('Yes').up()
      .ele('ISPARTYLEDGER').txt('Yes').up()
      .ele('AMOUNT').txt(`-${v.net_amount.toFixed(2)}`).up()
      .up();

    // 2. Sales / Job Work Income Ledger Allocation (Credit - Negative Gross Amount)
    voucher
      .ele('ALLLEDGERENTRIES.LIST')
      .ele('LEDGERNAME').txt('Embroidery Job Work (SAC 9988)').up()
      .ele('ISDEEMEDPOSITIVE').txt('No').up()
      .ele('ISPARTYLEDGER').txt('No').up()
      .ele('AMOUNT').txt(`${v.gross_amount.toFixed(2)}`).up()
      .up();

    // 3. Tax Ledgers
    if (isIntraState) {
      if (v.cgst_amount > 0) {
        voucher
          .ele('ALLLEDGERENTRIES.LIST')
          .ele('LEDGERNAME').txt('Output CGST 2.5%').up()
          .ele('ISDEEMEDPOSITIVE').txt('No').up()
          .ele('ISPARTYLEDGER').txt('No').up()
          .ele('AMOUNT').txt(`${v.cgst_amount.toFixed(2)}`).up()
          .up();
      }
      if (v.sgst_amount > 0) {
        voucher
          .ele('ALLLEDGERENTRIES.LIST')
          .ele('LEDGERNAME').txt('Output SGST 2.5%').up()
          .ele('ISDEEMEDPOSITIVE').txt('No').up()
          .ele('ISPARTYLEDGER').txt('No').up()
          .ele('AMOUNT').txt(`${v.sgst_amount.toFixed(2)}`).up()
          .up();
      }
    } else {
      if (v.igst_amount > 0) {
        voucher
          .ele('ALLLEDGERENTRIES.LIST')
          .ele('LEDGERNAME').txt('Output IGST 5.0%').up()
          .ele('ISDEEMEDPOSITIVE').txt('No').up()
          .ele('ISPARTYLEDGER').txt('No').up()
          .ele('AMOUNT').txt(`${v.igst_amount.toFixed(2)}`).up()
          .up();
      }
    }
  }

  return root.end({ prettyPrint: true });
}
