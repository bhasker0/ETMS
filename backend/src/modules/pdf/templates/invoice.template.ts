function numberToIndianWords(num: number): string {
  if (!num || isNaN(num)) return 'Zero Rupees Only';
  const a = [
    '',
    'One ',
    'Two ',
    'Three ',
    'Four ',
    'Five ',
    'Six ',
    'Seven ',
    'Eight ',
    'Nine ',
    'Ten ',
    'Eleven ',
    'Twelve ',
    'Thirteen ',
    'Fourteen ',
    'Fifteen ',
    'Sixteen ',
    'Seventeen ',
    'Eighteen ',
    'Nineteen ',
  ];
  const b = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ];

  const inWords = (n: number): string => {
    let str = '';
    if (n >= 10000000) {
      str += inWords(Math.floor(n / 10000000)) + 'Crore ';
      n %= 10000000;
    }
    if (n >= 100000) {
      str += inWords(Math.floor(n / 100000)) + 'Lakh ';
      n %= 100000;
    }
    if (n >= 1000) {
      str += inWords(Math.floor(n / 1000)) + 'Thousand ';
      n %= 1000;
    }
    if (n >= 100) {
      str += inWords(Math.floor(n / 100)) + 'Hundred ';
      n %= 100;
    }
    if (n > 0) {
      if (n < 20) {
        str += a[n];
      } else {
        str += b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : ' ');
      }
    }
    return str;
  };

  const whole = Math.floor(num);
  const fraction = Math.round((num - whole) * 100);
  let res = 'INR ' + inWords(whole).trim() + ' Rupees';
  if (fraction > 0) {
    res += ' and ' + inWords(fraction).trim() + ' Paise';
  }
  return res + ' Only';
}

function formatDate(dateStr: string): string {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

export function generateInvoiceHtml(data: {
  company: {
    name: string;
    gstin: string;
    address: string;
    phone: string;
    bank_details?: {
      bank_name?: string;
      account_no?: string;
      ifsc_code?: string;
      branch?: string;
    };
    terms_and_conditions?: string[] | string;
  };
  invoice: {
    invoice_no: string;
    invoice_date: string;
    trader_name: string;
    trader_gstin?: string;
    trader_mobile?: string;
    sac_code: string;
    machine_heads: number;
    total_stitches: number;
    rate_per_1000: number;
    gross_amount: number;
    cgst_amount: number;
    sgst_amount: number;
    igst_amount: number;
    gst_5_percent: number;
    net_amount: number;
    inward_meters: number;
    outward_meters: number;
    shrinkage_percent: number;
    is_shrinkage_exceeded: boolean;
    shrinkage_warning?: string;
    lot_items?: any[];
  };
  challan?: {
    challan_no?: string;
    lot_no?: string;
    than_count?: number;
    fabric_quality?: string;
    design_no?: string;
  };
}): string {
  const company = data.company || {
    name: 'RADHE KRISHNA EMBROIDERY WORKS',
    gstin: '',
    address: '',
    phone: '',
  };
  const invoice = data.invoice;
  const challan = data.challan || {
    challan_no: (data.invoice as any)?.inwardChallan?.challan_no || 'N/A',
    lot_no: (data.invoice as any)?.inwardChallan?.lot_no || 'N/A',
    than_count: (data.invoice as any)?.inwardChallan?.than_count || 1,
    fabric_quality:
      (data.invoice as any)?.inwardChallan?.fabric_quality ||
      'Standard Job-Work',
    design_no: (data.invoice as any)?.inwardChallan?.design_no || 'N/A',
  };

  const safeChallanNo = challan.challan_no || 'N/A';
  const safeLotNo = challan.lot_no || 'N/A';
  const safeFabric = challan.fabric_quality || 'Standard Job-Work';
  const safeThan = challan.than_count || 1;
  const safeDesign = challan.design_no || 'N/A';
  const traderMobile =
    invoice.trader_mobile || (invoice as any)?.party?.mobile || '';

  const bank = company.bank_details || {};
  const bankName = bank.bank_name || 'HDFC Bank Ltd';
  const bankAccNo = bank.account_no || '50200088991122';
  const bankIfsc = bank.ifsc_code || 'HDFC0000256';
  const bankBranch = bank.branch || 'Ring Road Branch, Surat';

  let termsList: string[] = [];
  if (Array.isArray(company.terms_and_conditions)) {
    termsList = company.terms_and_conditions;
  } else if (typeof company.terms_and_conditions === 'string') {
    termsList = company.terms_and_conditions.split('\n').filter(Boolean);
  } else {
    termsList = [
      '1. Subject to Surat jurisdiction only.',
      '2. Goods once processed/delivered will not be taken back.',
      '3. Payment due within 15 days. Interest @ 18% p.a. applicable thereafter.',
      '4. Any shortage/damage complaint must be registered within 3 days.',
    ];
  }

  const rawLotItems = (invoice as any).lot_items;
  const validLotItems = Array.isArray(rawLotItems)
    ? rawLotItems.filter(
        (it: any) =>
          it &&
          typeof it === 'object' &&
          !Array.isArray(it) &&
          (it.lot_no ||
            it.design_no ||
            (it.meters && Number(it.meters) > 0) ||
            (it.stitch_count && Number(it.stitch_count) > 0)),
      )
    : [];

  let itemRowsHtml = '';
  let sumStitches = 0;
  let sumAmount = 0;

  if (validLotItems.length > 0) {
    itemRowsHtml = validLotItems
      .map((it: any, index: number) => {
        const itemLot = it.lot_no || safeLotNo;
        const itemDesign = it.design_no || safeDesign;
        const itemFabric = it.fabric_quality || safeFabric;
        const itemMeters = it.meters ? `${Number(it.meters).toFixed(1)}m` : '';
        const itemThans = it.thans ? `${it.thans} Th` : '';
        const itemHeads = Number(
          it.machine_heads || invoice.machine_heads || 32,
        );
        const itemStitches = Number(
          it.stitch_count ||
            Math.round(Number(invoice.total_stitches) / validLotItems.length),
        );
        const itemRate = Number(
          it.rate != null ? it.rate : invoice.rate_per_1000,
        );
        const itemAmount =
          it.taxable_amount != null
            ? Number(it.taxable_amount)
            : Number(((itemStitches / 1000) * itemRate * itemHeads).toFixed(2));

        sumStitches += itemStitches;
        sumAmount += itemAmount;

        const specDetails = [itemFabric, itemMeters, itemThans]
          .filter(Boolean)
          .join(' • ');

        return `
        <tr>
          <td class="text-center font-mono">${index + 1}</td>
          <td>
            <span class="font-bold">Embroidery Job-Work</span>${specDetails ? ` - <span class="text-muted">${specDetails}</span>` : ''}
            <div class="formula-text">[(${itemStitches.toLocaleString('en-IN')} / 1000) × ₹${itemRate.toFixed(4)} × ${itemHeads} Heads]</div>
          </td>
          <td class="text-center font-mono">${invoice.sac_code || '9988'}</td>
          <td class="text-center font-mono font-bold">${itemLot}</td>
          <td class="text-center font-mono font-bold">${itemDesign}</td>
          <td class="text-center font-mono">${itemHeads}</td>
          <td class="text-right font-mono">${itemStitches.toLocaleString('en-IN')}</td>
          <td class="text-right font-mono">₹${itemRate.toFixed(4)}</td>
          <td class="text-right font-mono font-bold">₹${itemAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>`;
      })
      .join('');
  } else {
    const specDetails = [
      safeFabric,
      invoice.outward_meters
        ? `${Number(invoice.outward_meters).toFixed(1)}m`
        : '',
      safeThan ? `${safeThan} Thans` : '',
    ]
      .filter(Boolean)
      .join(' • ');

    sumStitches = Number(invoice.total_stitches);
    sumAmount = Number(invoice.gross_amount);

    itemRowsHtml = `
      <tr>
        <td class="text-center font-mono">1</td>
        <td>
          <span class="font-bold">Embroidery Job-Work on Fabric</span>${specDetails ? ` - <span class="text-muted">${specDetails}</span>` : ''}
          <div class="formula-text">[(${Number(invoice.total_stitches).toLocaleString('en-IN')} / 1000) × ₹${Number(invoice.rate_per_1000).toFixed(4)} × ${invoice.machine_heads} Heads]</div>
        </td>
        <td class="text-center font-mono">${invoice.sac_code || '9988'}</td>
        <td class="text-center font-mono font-bold">${safeLotNo}</td>
        <td class="text-center font-mono font-bold">${safeDesign}</td>
        <td class="text-center font-mono">${invoice.machine_heads}</td>
        <td class="text-right font-mono">${Number(invoice.total_stitches).toLocaleString('en-IN')}</td>
        <td class="text-right font-mono">₹${Number(invoice.rate_per_1000).toFixed(4)}</td>
        <td class="text-right font-mono font-bold">₹${Number(invoice.gross_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>`;
  }

  const grossAmt = Number(invoice.gross_amount) || sumAmount;
  const netAmt = Number(invoice.net_amount);
  const amountInWords = numberToIndianWords(netAmt);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Tax Invoice - ${invoice.invoice_no}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 4mm 5mm 12mm 5mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
      font-size: 8.2pt;
      line-height: 1.2;
      color: #000;
      background: #fff;
      margin: 0;
      padding: 0;
    }
    .invoice-wrapper {
      width: 100%;
      border: 1.5px solid #000;
    }
    .header-tag {
      background: #f0f0f0;
      border-bottom: 1px solid #000;
      text-align: center;
      padding: 2.5px 0;
      font-size: 9pt;
      font-weight: bold;
      letter-spacing: 0.8px;
    }
    .header-subtag {
      font-size: 6.5pt;
      font-weight: normal;
      color: #333;
      margin-top: 1px;
    }
    .company-block {
      text-align: center;
      padding: 4px 6px;
      border-bottom: 1px solid #000;
    }
    .company-title {
      font-size: 13pt;
      font-weight: 900;
      letter-spacing: 0.5px;
      margin: 0;
      color: #000;
      text-transform: uppercase;
    }
    .company-subtitle {
      font-size: 7.5pt;
      font-weight: bold;
      color: #222;
      margin-top: 1px;
    }
    .company-meta {
      font-size: 7.2pt;
      color: #222;
      margin-top: 1.5px;
    }
    .grid-2 {
      display: table;
      width: 100%;
      border-bottom: 1px solid #000;
    }
    .col-left {
      display: table-cell;
      width: 54%;
      border-right: 1px solid #000;
      padding: 3px 5px;
      vertical-align: top;
    }
    .col-right {
      display: table-cell;
      width: 46%;
      padding: 3px 5px;
      vertical-align: top;
    }
    .sec-label {
      font-size: 7pt;
      font-weight: bold;
      text-transform: uppercase;
      color: #333;
      border-bottom: 0.5px solid #ccc;
      padding-bottom: 1px;
      margin-bottom: 2px;
    }
    .party-name {
      font-size: 9.5pt;
      font-weight: bold;
      color: #000;
      margin-bottom: 1.5px;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.8pt;
    }
    .info-table td {
      padding: 1px 0;
      vertical-align: top;
    }
    .info-table td.lbl {
      color: #444;
      width: 38%;
    }
    .info-table td.val {
      font-weight: 600;
      color: #000;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.6pt;
      page-break-inside: auto;
    }
    .items-table thead {
      display: table-header-group;
    }
    .items-table tfoot {
      display: table-footer-group;
    }
    .items-table tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    .items-table th {
      background: #f2f2f2;
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
      border-right: 1px solid #000;
      padding: 3px 3px;
      font-weight: bold;
      font-size: 7.2pt;
      text-transform: uppercase;
      text-align: center;
    }
    .items-table th:last-child {
      border-right: none;
    }
    .items-table td {
      border-bottom: 0.5px solid #d4d4d4;
      border-right: 1px solid #000;
      padding: 2.5px 3px;
      vertical-align: middle;
    }
    .items-table td:last-child {
      border-right: none;
    }
    .items-table tr:last-child td {
      border-bottom: 1px solid #000;
    }
    .formula-text {
      font-size: 6.2pt;
      color: #555;
      font-family: Consolas, monospace;
      margin-top: 0.5px;
    }
    .total-row td {
      background: #fafafa;
      border-top: 1px solid #000 !important;
      border-bottom: 1px solid #000 !important;
      font-weight: bold;
      font-size: 7.8pt;
      padding: 3px 3px;
    }
    .calc-grid {
      display: table;
      width: 100%;
      border-bottom: 1px solid #000;
      page-break-inside: avoid;
    }
    .calc-left {
      display: table-cell;
      width: 55%;
      border-right: 1px solid #000;
      padding: 3.5px 5px;
      vertical-align: top;
    }
    .calc-right {
      display: table-cell;
      width: 45%;
      padding: 0;
      vertical-align: top;
    }
    .summary-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.8pt;
    }
    .summary-table td {
      padding: 2px 5px;
      border-bottom: 0.5px solid #e5e5e5;
    }
    .summary-table tr:last-child td {
      border-bottom: none;
    }
    .net-payable-box {
      background: #f0fdf4;
      border-top: 1px solid #000;
      padding: 3px 5px;
      font-size: 9pt;
      font-weight: bold;
    }
    .words-box {
      margin-top: 3px;
      padding-top: 2.5px;
      border-top: 0.5px dashed #bbb;
      font-size: 7.2pt;
    }
    .footer-grid {
      display: table;
      width: 100%;
      min-height: 80px;
      page-break-inside: avoid;
    }
    .footer-col-1 {
      display: table-cell;
      width: 34%;
      border-right: 1px solid #000;
      padding: 3.5px 5px;
      vertical-align: top;
    }
    .footer-col-2 {
      display: table-cell;
      width: 38%;
      border-right: 1px solid #000;
      padding: 3.5px 5px;
      vertical-align: top;
    }
    .footer-col-3 {
      display: table-cell;
      width: 28%;
      padding: 3.5px 5px;
      vertical-align: top;
      text-align: center;
    }
    .terms-text {
      font-size: 6.3pt;
      line-height: 1.25;
      color: #222;
    }
    .sign-space {
      height: 38px;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-mono { font-family: "Courier New", Courier, monospace; }
    .font-bold { font-weight: bold; }
    .text-muted { color: #555; font-size: 7pt; }
  </style>
</head>
<body>

<div class="invoice-wrapper">
  <!-- Top Tag -->
  <div class="header-tag">
    TAX INVOICE / JOB-WORK DELIVERY CHALLAN
    <div class="header-subtag">Issued Under Rule 55 of CGST Rules, 2017 • GST SAC 9988 (Central Tax 2.5% + State Tax 2.5%)</div>
  </div>

  <!-- Company Header -->
  <div class="company-block">
    <div class="company-title">${company.name}</div>
    <div class="company-subtitle">Multi-Head Computerized Embroidery Job-Work on Textile Fabrics</div>
    <div class="company-meta">${company.address}</div>
    <div class="company-meta">
      <strong>GSTIN:</strong> ${company.gstin} &nbsp;|&nbsp;
      <strong>State:</strong> Gujarat (Code: 24) &nbsp;|&nbsp;
      <strong>Phone:</strong> ${company.phone || 'N/A'}
    </div>
  </div>

  <!-- 2-Column Details Grid -->
  <div class="grid-2">
    <!-- Left: Buyer / Trader -->
    <div class="col-left">
      <div class="sec-label">Details of Receiver / Billed To (Trader):</div>
      <div class="party-name">M/s. ${invoice.trader_name}</div>
      <table class="info-table">
        <tr>
          <td class="lbl">GSTIN / UIN:</td>
          <td class="val font-mono">${invoice.trader_gstin || 'Unregistered'}</td>
        </tr>
        <tr>
          <td class="lbl">Party Mobile:</td>
          <td class="val font-mono">${traderMobile ? '+91 ' + traderMobile : 'N/A'}</td>
        </tr>
        <tr>
          <td class="lbl">Place of Supply:</td>
          <td class="val">Gujarat (State Code: 24)</td>
        </tr>
        <tr>
          <td class="lbl">Station / City:</td>
          <td class="val">Surat, Gujarat</td>
        </tr>
      </table>
    </div>

    <!-- Right: Invoice & Dispatch Info -->
    <div class="col-right">
      <div class="sec-label">Invoice & Delivery Particulars:</div>
      <table class="info-table">
        <tr>
          <td class="lbl">Invoice No:</td>
          <td class="val font-mono font-bold">${invoice.invoice_no}</td>
        </tr>
        <tr>
          <td class="lbl">Invoice Date:</td>
          <td class="val font-mono">${formatDate(invoice.invoice_date)}</td>
        </tr>
        <tr>
          <td class="lbl">Inward Ref Challan:</td>
          <td class="val font-mono">${safeChallanNo}</td>
        </tr>
        <tr>
          <td class="lbl">Inward Lot No:</td>
          <td class="val font-mono font-bold">${safeLotNo}</td>
        </tr>
        <tr>
          <td class="lbl">Fabric Quality:</td>
          <td class="val">${safeFabric} (${safeThan} Thans)</td>
        </tr>
        <tr>
          <td class="lbl">Reverse Charge:</td>
          <td class="val">No</td>
        </tr>
      </table>
    </div>
  </div>

  <!-- Items Table -->
  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 4%;">Sr.</th>
        <th style="width: 32%;">Description of Job-Work / Particulars</th>
        <th style="width: 8%;">SAC</th>
        <th style="width: 10%;">Lot No</th>
        <th style="width: 11%;">Design No</th>
        <th style="width: 6%;">Heads</th>
        <th style="width: 10%; text-align: right;">Stitches</th>
        <th style="width: 8%; text-align: right;">Rate / 1k</th>
        <th style="width: 11%; text-align: right;">Amount (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${itemRowsHtml}
      <tr class="total-row">
        <td colspan="6" class="text-right font-bold">TOTAL:</td>
        <td class="text-right font-mono font-bold">${sumStitches.toLocaleString('en-IN')}</td>
        <td></td>
        <td class="text-right font-mono font-bold">₹${grossAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    </tbody>
  </table>

  <!-- Calculation & Reconciliation Grid -->
  <div class="calc-grid">
    <!-- Left: Meters & Words -->
    <div class="calc-left">
      <div class="sec-label">Fabric Meters & Shrinkage Reconciliation:</div>
      <table class="info-table" style="margin-top: 1px;">
        <tr>
          <td class="lbl">Inward Fabric:</td>
          <td class="val font-mono">${Number(invoice.inward_meters).toFixed(2)} m</td>
          <td class="lbl">Outward Fabric:</td>
          <td class="val font-mono">${Number(invoice.outward_meters).toFixed(2)} m</td>
        </tr>
        <tr>
          <td class="lbl">Shrinkage %:</td>
          <td class="val font-mono" colspan="3">
            ${Number(invoice.shrinkage_percent).toFixed(2)}%
            <span style="font-size: 6.5pt; color: ${invoice.is_shrinkage_exceeded ? '#b91c1c' : '#15803d'}; font-weight: bold;">
              (${invoice.is_shrinkage_exceeded ? '⚠️ Exceeds 3.0% tolerance' : '✓ Normal tolerance ≤ 3.0%'})
            </span>
          </td>
        </tr>
      </table>

      <div class="words-box">
        <strong>Amount Chargeable in Words:</strong><br>
        <span class="font-bold font-mono" style="font-size: 7.6pt; color: #111;">${amountInWords}</span>
      </div>
    </div>

    <!-- Right: GST Breakdown & Net Payable -->
    <div class="calc-right">
      <table class="summary-table">
        <tr>
          <td>Gross Job-Work Taxable Amount:</td>
          <td class="text-right font-mono font-bold">₹${grossAmt.toFixed(2)}</td>
        </tr>
        ${
          invoice.igst_amount > 0
            ? `<tr>
                <td>Integrated GST (IGST @ 5.0%):</td>
                <td class="text-right font-mono">₹${Number(invoice.igst_amount).toFixed(2)}</td>
               </tr>`
            : `<tr>
                <td>Central GST (CGST @ 2.5%):</td>
                <td class="text-right font-mono">₹${Number(invoice.cgst_amount).toFixed(2)}</td>
               </tr>
               <tr>
                <td>State GST (SGST @ 2.5%):</td>
                <td class="text-right font-mono">₹${Number(invoice.sgst_amount).toFixed(2)}</td>
               </tr>`
        }
        <tr>
          <td>Total Tax Amount (5% SAC 9988):</td>
          <td class="text-right font-mono">₹${Number(invoice.gst_5_percent).toFixed(2)}</td>
        </tr>
      </table>
      <div class="net-payable-box">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>NET PAYABLE AMOUNT:</span>
          <span class="font-mono" style="font-size: 11pt;">₹${netAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Footer Grid: Bank, Terms & Signatures -->
  <div class="footer-grid">
    <!-- Col 1: Bank Particulars -->
    <div class="footer-col-1">
      <div class="sec-label">Bank Particulars for Payment:</div>
      <table class="info-table" style="font-size: 7.2pt;">
        <tr>
          <td class="lbl">Bank Name:</td>
          <td class="val font-bold">${bankName}</td>
        </tr>
        <tr>
          <td class="lbl">A/C No:</td>
          <td class="val font-mono font-bold">${bankAccNo}</td>
        </tr>
        <tr>
          <td class="lbl">IFSC Code:</td>
          <td class="val font-mono font-bold">${bankIfsc}</td>
        </tr>
        <tr>
          <td class="lbl">Branch:</td>
          <td class="val">${bankBranch}</td>
        </tr>
      </table>
    </div>

    <!-- Col 2: Terms & Conditions -->
    <div class="footer-col-2">
      <div class="sec-label">Terms & Conditions:</div>
      <div class="terms-text">
        ${termsList.map((t) => `<div>${t}</div>`).join('')}
      </div>
    </div>

    <!-- Col 3: Signatures -->
    <div class="footer-col-3">
      <div style="font-size: 7.2pt; font-weight: bold; text-transform: uppercase;">
        For ${company.name}
      </div>
      <div class="sign-space"></div>
      <div style="font-size: 7.5pt; font-weight: bold; border-top: 0.5px solid #000; padding-top: 2px;">
        Authorised Signatory
      </div>
      <div style="font-size: 6.2pt; color: #444; margin-top: 2px;">
        Receiver's Signature & Stamp
      </div>
    </div>
  </div>
</div>

</body>
</html>`.trim();
}
