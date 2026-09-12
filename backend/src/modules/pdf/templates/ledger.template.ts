function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
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

function formatINR(val: number): string {
  if (val === undefined || val === null || isNaN(val)) return '₹0.00';
  return '₹' + Number(val).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function numberToIndianWords(num: number): string {
  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
    'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen ',
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const n = Math.round(Math.abs(num));
  if (n === 0) return 'Zero Rupees Only';

  function inWords(val: number): string {
    let str = '';
    if (val >= 10000000) {
      str += inWords(Math.floor(val / 10000000)) + 'Crore ';
      val %= 10000000;
    }
    if (val >= 100000) {
      str += inWords(Math.floor(val / 100000)) + 'Lakh ';
      val %= 100000;
    }
    if (val >= 1000) {
      str += inWords(Math.floor(val / 1000)) + 'Thousand ';
      val %= 1000;
    }
    if (val >= 100) {
      str += inWords(Math.floor(val / 100)) + 'Hundred ';
      val %= 100;
    }
    if (val > 0) {
      if (val < 20) {
        str += a[val];
      } else {
        str += b[Math.floor(val / 10)] + (val % 10 !== 0 ? ' ' + a[val % 10] : ' ');
      }
    }
    return str;
  }

  const words = inWords(n).trim();
  return `INR ${words} Rupees Only`;
}

export function generateLedgerHtml(data: {
  company: {
    name: string;
    gstin: string;
    address: string;
    phone: string;
    bank_details?: {
      bank_name: string;
      account_no: string;
      ifsc_code: string;
      branch: string;
    };
  };
  party: {
    id: string;
    name: string;
    gstin?: string;
    mobile?: string;
    city?: string;
    credit_period_days?: number;
    opening_balance?: number;
  };
  period: {
    startDate?: string;
    endDate?: string;
    generatedAt: string;
  };
  metrics: {
    opening_balance: number;
    total_billed_amount: number;
    total_inward_meters: number;
    total_inward_lots: number;
    total_outward_meters: number;
    total_invoices_count: number;
    closing_balance: number;
    fabric_in_process_meters: number;
    aging: {
      within_15_days: number;
      days_16_to_30: number;
      above_30_days: number;
    };
  };
  timeline: Array<{
    id: string;
    date: string;
    type: 'INWARD_LOT' | 'OUTWARD_INVOICE';
    ref_no: string;
    particulars: string;
    quantity_info: string;
    debit: number;
    credit: number;
    running_balance: number;
  }>;
}): string {
  const { company, party, period, metrics, timeline } = data;

  const bank = company.bank_details || {
    bank_name: 'HDFC Bank Ltd',
    account_no: '50200088991122',
    ifsc_code: 'HDFC0000256',
    branch: 'Ring Road Textile Market, Surat',
  };

  let totalDebits = 0;
  let totalCredits = 0;

  const rowsHtml = timeline
    .map((ev, idx) => {
      totalDebits += Number(ev.debit || 0);
      totalCredits += Number(ev.credit || 0);

      const isInv = ev.type === 'OUTWARD_INVOICE';
      return `
      <tr>
        <td class="text-center font-mono">${idx + 1}</td>
        <td class="text-center font-mono">${formatDate(ev.date)}</td>
        <td class="text-center">
          <span class="type-tag ${isInv ? 'tag-inv' : 'tag-lot'}">
            ${isInv ? 'INVOICE' : 'INWARD LOT'}
          </span>
        </td>
        <td class="font-mono font-bold">${ev.ref_no || '—'}</td>
        <td>
          <div class="part-main">${ev.particulars || 'Textile Processing'}</div>
          <div class="part-sub">${ev.quantity_info || ''}</div>
        </td>
        <td class="text-right font-mono font-bold ${ev.debit > 0 ? 'text-debit' : ''}">
          ${ev.debit > 0 ? formatINR(ev.debit) : '—'}
        </td>
        <td class="text-right font-mono font-bold ${ev.credit > 0 ? 'text-credit' : ''}">
          ${ev.credit > 0 ? formatINR(ev.credit) : '—'}
        </td>
        <td class="text-right font-mono font-bold">
          ${formatINR(ev.running_balance)}
        </td>
      </tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Party Statement - ${party.name}</title>
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
    .ledger-wrapper {
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
      padding: 4px 6px;
      vertical-align: top;
    }
    .col-right {
      display: table-cell;
      width: 46%;
      padding: 4px 6px;
      vertical-align: top;
    }
    .sec-label {
      font-size: 7pt;
      font-weight: bold;
      text-transform: uppercase;
      color: #333;
      border-bottom: 0.5px solid #ccc;
      padding-bottom: 1px;
      margin-bottom: 3px;
    }
    .party-name {
      font-size: 10.5pt;
      font-weight: bold;
      color: #000;
      margin-bottom: 2px;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.8pt;
    }
    .info-table td {
      padding: 1.5px 0;
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
    .metrics-bar {
      display: table;
      width: 100%;
      border-bottom: 1px solid #000;
      background: #fafafa;
    }
    .metric-cell {
      display: table-cell;
      width: 16.66%;
      border-right: 0.5px solid #ccc;
      padding: 3px 4px;
      text-align: center;
    }
    .metric-cell:last-child {
      border-right: none;
      background: #f3f4f6;
    }
    .m-lbl {
      font-size: 6.2pt;
      font-weight: bold;
      text-transform: uppercase;
      color: #555;
    }
    .m-val {
      font-size: 8.5pt;
      font-weight: bold;
      font-family: "Courier New", Courier, monospace;
      color: #000;
      margin-top: 1px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.5pt;
      page-break-inside: auto;
    }
    .items-table thead {
      display: table-header-group;
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
      padding: 3px 4px;
      font-weight: bold;
      font-size: 7pt;
      text-transform: uppercase;
      text-align: center;
    }
    .items-table th:last-child {
      border-right: none;
    }
    .items-table td {
      border-bottom: 0.5px solid #d4d4d4;
      border-right: 1px solid #000;
      padding: 3px 4px;
      vertical-align: middle;
    }
    .items-table td:last-child {
      border-right: none;
    }
    .type-tag {
      font-size: 6.2pt;
      font-weight: bold;
      text-transform: uppercase;
      padding: 1px 3px;
      border-radius: 2px;
    }
    .tag-inv {
      background: #dbeafe;
      border: 0.5px solid #2563eb;
      color: #1e40af;
    }
    .tag-lot {
      background: #fef3c7;
      border: 0.5px solid #d97706;
      color: #92400e;
    }
    .part-main { font-weight: 600; color: #000; }
    .part-sub { font-size: 6.6pt; color: #555; }
    .total-row td {
      background: #f9fafb;
      border-top: 1.5px solid #000 !important;
      border-bottom: 1px solid #000 !important;
      font-weight: bold;
      font-size: 8pt;
      padding: 3px 4px;
    }
    .aging-grid {
      border-top: 1px solid #000;
      display: table;
      width: 100%;
      background: #fff;
    }
    .aging-cell {
      display: table-cell;
      width: 25%;
      border-right: 0.5px solid #ccc;
      padding: 3px 6px;
      text-align: center;
    }
    .aging-cell:last-child {
      border-right: none;
    }
    .footer-box {
      border-top: 1px solid #000;
      display: table;
      width: 100%;
      page-break-inside: avoid;
    }
    .bank-col {
      display: table-cell;
      width: 50%;
      border-right: 1px solid #000;
      padding: 4px 6px;
      vertical-align: top;
    }
    .terms-col {
      display: table-cell;
      width: 50%;
      padding: 4px 6px;
      vertical-align: top;
    }
    .signatures-grid {
      border-top: 1px solid #000;
      display: table;
      width: 100%;
      page-break-inside: avoid;
    }
    .sign-col {
      display: table-cell;
      width: 50%;
      padding: 6px 8px;
      text-align: center;
      vertical-align: bottom;
    }
    .sign-col:first-child {
      border-right: 1px solid #000;
    }
    .sign-space { height: 40px; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-mono { font-family: "Courier New", Courier, monospace; }
    .font-bold { font-weight: bold; }
    .text-debit { color: #b91c1c; }
    .text-credit { color: #15803d; }
  </style>
</head>
<body>

<div class="ledger-wrapper">
  <!-- Top Header Tag -->
  <div class="header-tag">
    STATEMENT OF ACCOUNT / KHATA LEDGER
    <div style="font-size: 6.5pt; font-weight: normal; color: #444; margin-top: 1px;">
      Job-Work Ledger & Running Balance under GST SAC 9988
    </div>
  </div>

  <!-- Company Block -->
  <div class="company-block">
    <div class="company-title">${company.name}</div>
    <div class="company-subtitle">Multi-Head Computerized Embroidery Job-Work Unit</div>
    <div class="company-meta">${company.address}</div>
    <div class="company-meta">
      <strong>GSTIN:</strong> ${company.gstin} &nbsp;|&nbsp;
      <strong>State:</strong> Gujarat (Code: 24) &nbsp;|&nbsp;
      <strong>Phone:</strong> ${company.phone || 'N/A'}
    </div>
  </div>

  <!-- 2-Column Info Grid -->
  <div class="grid-2">
    <!-- Left: Trader / Party Details -->
    <div class="col-left">
      <div class="sec-label">Client / Trader Particulars:</div>
      <div class="party-name">M/s. ${party.name}</div>
      <table class="info-table">
        <tr>
          <td class="lbl">GSTIN / UIN:</td>
          <td class="val font-mono">${party.gstin || 'Unregistered / URP'}</td>
        </tr>
        <tr>
          <td class="lbl">Mobile No:</td>
          <td class="val font-mono">${party.mobile ? '+91 ' + party.mobile : 'N/A'}</td>
        </tr>
        <tr>
          <td class="lbl">Station / City:</td>
          <td class="val">${party.city || 'Surat, Gujarat'}</td>
        </tr>
        <tr>
          <td class="lbl">Credit Terms:</td>
          <td class="val font-mono">${party.credit_period_days || 15} Days</td>
        </tr>
      </table>
    </div>

    <!-- Right: Statement Period & Date -->
    <div class="col-right">
      <div class="sec-label">Statement Particulars:</div>
      <table class="info-table">
        <tr>
          <td class="lbl">Period From:</td>
          <td class="val font-mono font-bold">${period.startDate ? formatDate(period.startDate) : 'Opening Record'}</td>
        </tr>
        <tr>
          <td class="lbl">Period To:</td>
          <td class="val font-mono font-bold">${period.endDate ? formatDate(period.endDate) : formatDate(new Date().toISOString())}</td>
        </tr>
        <tr>
          <td class="lbl">Generated On:</td>
          <td class="val font-mono">${period.generatedAt}</td>
        </tr>
        <tr>
          <td class="lbl">Opening Balance:</td>
          <td class="val font-mono font-bold">${formatINR(metrics.opening_balance)}</td>
        </tr>
        <tr>
          <td class="lbl">Current Balance:</td>
          <td class="val font-mono font-bold" style="font-size: 9.5pt; color: #b91c1c;">
            ${formatINR(metrics.closing_balance)} Dr
          </td>
        </tr>
      </table>
    </div>
  </div>

  <!-- Metrics Bar -->
  <div class="metrics-bar">
    <div class="metric-cell">
      <div class="m-lbl">Opening Bal</div>
      <div class="m-val">${formatINR(metrics.opening_balance)}</div>
    </div>
    <div class="metric-cell">
      <div class="m-lbl">Inward Lots</div>
      <div class="m-val">${metrics.total_inward_lots} Lots</div>
    </div>
    <div class="metric-cell">
      <div class="m-lbl">Inward Fabric</div>
      <div class="m-val">${Number(metrics.total_inward_meters).toFixed(0)} m</div>
    </div>
    <div class="metric-cell">
      <div class="m-lbl">Outward Bills</div>
      <div class="m-val">${metrics.total_invoices_count} Invs</div>
    </div>
    <div class="metric-cell">
      <div class="m-lbl">Total Billed</div>
      <div class="m-val">${formatINR(metrics.total_billed_amount)}</div>
    </div>
    <div class="metric-cell">
      <div class="m-lbl" style="color: #b91c1c;">Net Outstanding</div>
      <div class="m-val" style="color: #b91c1c;">${formatINR(metrics.closing_balance)}</div>
    </div>
  </div>

  <!-- Ledger Items Table -->
  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 4%;">Sr.</th>
        <th style="width: 10%;">Date</th>
        <th style="width: 10%;">Type</th>
        <th style="width: 15%;">Ref / Bill No</th>
        <th style="width: 27%;">Description / Particulars</th>
        <th style="width: 11%; text-align: right;">Debit (₹)</th>
        <th style="width: 11%; text-align: right;">Credit (₹)</th>
        <th style="width: 12%; text-align: right;">Balance (₹)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="text-center font-mono">—</td>
        <td class="text-center font-mono">—</td>
        <td class="text-center"><span class="type-tag" style="background:#e5e7eb; border:0.5px solid #9ca3af; color:#374151;">OPENING</span></td>
        <td class="font-mono font-bold">B/F</td>
        <td><div class="part-main">Opening Balance Brought Forward</div></td>
        <td class="text-right font-mono">—</td>
        <td class="text-right font-mono">—</td>
        <td class="text-right font-mono font-bold">${formatINR(metrics.opening_balance)}</td>
      </tr>
      ${rowsHtml}
      <tr class="total-row">
        <td colspan="5" class="text-right font-bold">TOTAL BILLED & CLOSING BALANCE:</td>
        <td class="text-right font-mono font-bold text-debit">${formatINR(totalDebits)}</td>
        <td class="text-right font-mono font-bold text-credit">${formatINR(totalCredits)}</td>
        <td class="text-right font-mono font-bold" style="font-size: 9pt; color: #b91c1c;">
          ${formatINR(metrics.closing_balance)}
        </td>
      </tr>
    </tbody>
  </table>

  <!-- Aging Grid -->
  <div class="aging-grid">
    <div class="aging-cell">
      <div class="m-lbl">Aging Analysis</div>
      <div style="font-size: 7.2pt; font-weight: bold; margin-top: 1px;">Outstanding Split</div>
    </div>
    <div class="aging-cell">
      <div class="m-lbl">0 - 15 Days (Current)</div>
      <div class="m-val" style="color: #15803d;">${formatINR(metrics.aging.within_15_days)}</div>
    </div>
    <div class="aging-cell">
      <div class="m-lbl">16 - 30 Days (Due)</div>
      <div class="m-val" style="color: #d97706;">${formatINR(metrics.aging.days_16_to_30)}</div>
    </div>
    <div class="aging-cell">
      <div class="m-lbl">> 30 Days (Overdue)</div>
      <div class="m-val" style="color: #b91c1c;">${formatINR(metrics.aging.above_30_days)}</div>
    </div>
  </div>

  <!-- Amount in Words -->
  <div style="padding: 3px 6px; border-top: 1px solid #000; background: #fff; font-size: 7.5pt;">
    <strong>Closing Balance in Words:</strong> ${numberToIndianWords(metrics.closing_balance)}
  </div>

  <!-- Bank & Terms -->
  <div class="footer-box">
    <div class="bank-col">
      <div class="sec-label">Bank Particulars for Direct RTGS / NEFT / IMPS:</div>
      <table class="info-table">
        <tr>
          <td class="lbl">Bank Name:</td>
          <td class="val">${bank.bank_name}</td>
        </tr>
        <tr>
          <td class="lbl">A/C No:</td>
          <td class="val font-mono font-bold">${bank.account_no}</td>
        </tr>
        <tr>
          <td class="lbl">IFSC Code:</td>
          <td class="val font-mono font-bold">${bank.ifsc_code}</td>
        </tr>
        <tr>
          <td class="lbl">Branch:</td>
          <td class="val">${bank.branch}</td>
        </tr>
      </table>
    </div>

    <div class="terms-col">
      <div class="sec-label">Terms & Conditions of Account:</div>
      <div style="font-size: 6.4pt; color: #333; line-height: 1.25;">
        1. All billing is for computerized embroidery job-work under GST SAC 9988.<br>
        2. Payment must be cleared within agreed credit period (${party.credit_period_days || 15} days).<br>
        3. Overdue balance attracts interest @ 18% p.a. from the invoice due date.<br>
        4. Kindly report any statement discrepancies within 7 days.<br>
        5. Subject to Surat jurisdiction only.
      </div>
    </div>
  </div>

  <!-- Signatures -->
  <div class="signatures-grid">
    <div class="sign-col">
      <div style="font-size: 7.2pt; font-weight: bold; text-transform: uppercase;">
        Client Confirmation / Stamp
      </div>
      <div class="sign-space"></div>
      <div style="font-size: 7.2pt; border-top: 0.5px solid #000; padding-top: 2px;">
        For M/s. ${party.name} (Receiver's Signature)
      </div>
    </div>
    <div class="sign-col">
      <div style="font-size: 7.2pt; font-weight: bold; text-transform: uppercase;">
        For ${company.name}
      </div>
      <div class="sign-space"></div>
      <div style="font-size: 7.2pt; border-top: 0.5px solid #000; padding-top: 2px;">
        Authorised Signatory / Accounts Department
      </div>
    </div>
  </div>
</div>

</body>
</html>`.trim();
}