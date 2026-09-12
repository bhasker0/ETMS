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

export function generateChallanHtml(data: {
  company: {
    name: string;
    gstin: string;
    address: string;
    phone: string;
  };
  challan: {
    id: string;
    challan_no: string;
    challan_date: string;
    trader_name: string;
    trader_gstin?: string;
    trader_mobile?: string;
    lot_no: string;
    than_count: number;
    inward_meters: number;
    fabric_quality: string;
    design_no?: string;
    stitch_count?: number;
    jobwork_price_per_1k?: number;
    status: string;
    notes?: string;
    items?: Array<{
      design_no: string;
      stitch_count?: number;
      jobwork_price_per_1k?: number;
      meters?: number;
      than_count?: number;
    }>;
  };
}): string {
  const { company, challan } = data;
  const items = Array.isArray(challan.items) && challan.items.length > 0
    ? challan.items
    : [
        {
          design_no: challan.design_no || 'Standard Job-Work',
          stitch_count: challan.stitch_count || 0,
          jobwork_price_per_1k: challan.jobwork_price_per_1k || 0,
          meters: challan.inward_meters || 0,
          than_count: challan.than_count || 1,
        },
      ];

  let sumMeters = 0;
  let sumThans = 0;
  let sumStitches = 0;

  const itemRowsHtml = items
    .map((it, idx) => {
      const m = Number(it.meters || (challan.inward_meters / items.length) || 0);
      const th = Number(it.than_count || 1);
      const st = Number(it.stitch_count || challan.stitch_count || 0);
      const rt = Number(it.jobwork_price_per_1k || challan.jobwork_price_per_1k || 0);

      sumMeters += m;
      sumThans += th;
      sumStitches += st;

      return `
      <tr>
        <td class="text-center font-mono">${idx + 1}</td>
        <td class="font-mono font-bold">${it.design_no || 'Standard'}</td>
        <td>${challan.fabric_quality || 'Embroidery Fabric'}</td>
        <td class="text-center font-mono font-bold">${th}</td>
        <td class="text-right font-mono font-bold">${m.toFixed(2)} m</td>
        <td class="text-right font-mono">${st > 0 ? st.toLocaleString('en-IN') : '—'}</td>
        <td class="text-right font-mono">${rt > 0 ? '₹' + rt.toFixed(4) : '—'}</td>
        <td class="text-center">
          <span class="status-badge">${challan.status.replace(/_/g, ' ')}</span>
        </td>
      </tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Inward Challan - ${challan.challan_no}</title>
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
    .challan-wrapper {
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
      width: 52%;
      border-right: 1px solid #000;
      padding: 4px 6px;
      vertical-align: top;
    }
    .col-right {
      display: table-cell;
      width: 48%;
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
      font-size: 10pt;
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
    .items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.6pt;
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
      padding: 3px 4px;
      vertical-align: middle;
    }
    .items-table td:last-child {
      border-right: none;
    }
    .total-row td {
      background: #fafafa;
      border-top: 1px solid #000 !important;
      border-bottom: 1px solid #000 !important;
      font-weight: bold;
      font-size: 8pt;
      padding: 3px 4px;
    }
    .status-badge {
      font-size: 6.5pt;
      font-weight: bold;
      text-transform: uppercase;
      padding: 1px 4px;
      border: 0.5px solid #000;
      background: #eef2ff;
      border-radius: 2px;
    }
    .footer-box {
      border-top: 1px solid #000;
      display: table;
      width: 100%;
      page-break-inside: avoid;
    }
    .notes-col {
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
    .sign-space {
      height: 45px;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-mono { font-family: "Courier New", Courier, monospace; }
    .font-bold { font-weight: bold; }
  </style>
</head>
<body>

<div class="challan-wrapper">
  <!-- Top Header Tag -->
  <div class="header-tag">
    DELIVERY CHALLAN FOR JOB-WORK (INWARD LOT RECEIPT)
    <div class="header-subtag">Issued Under Rule 55 of CGST Rules, 2017 • Movement of Goods for Job-Work in Textile Sector SAC 9988</div>
  </div>

  <!-- Company Header -->
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
    <!-- Left: Dispatched By / Trader -->
    <div class="col-left">
      <div class="sec-label">Goods Dispatched By / Trader (Party):</div>
      <div class="party-name">M/s. ${challan.trader_name}</div>
      <table class="info-table">
        <tr>
          <td class="lbl">GSTIN / UIN:</td>
          <td class="val font-mono">${challan.trader_gstin || 'Unregistered'}</td>
        </tr>
        <tr>
          <td class="lbl">Party Mobile:</td>
          <td class="val font-mono">${challan.trader_mobile ? '+91 ' + challan.trader_mobile : 'N/A'}</td>
        </tr>
        <tr>
          <td class="lbl">Place of Supply:</td>
          <td class="val">Gujarat (State Code: 24)</td>
        </tr>
        <tr>
          <td class="lbl">Consignor Station:</td>
          <td class="val">Surat Textile Market, Gujarat</td>
        </tr>
      </table>
    </div>

    <!-- Right: Challan Particulars -->
    <div class="col-right">
      <div class="sec-label">Inward Challan & Lot Particulars:</div>
      <table class="info-table">
        <tr>
          <td class="lbl">Challan No:</td>
          <td class="val font-mono font-bold">${challan.challan_no}</td>
        </tr>
        <tr>
          <td class="lbl">Challan Date:</td>
          <td class="val font-mono">${formatDate(challan.challan_date)}</td>
        </tr>
        <tr>
          <td class="lbl">Inward Lot No:</td>
          <td class="val font-mono font-bold" style="font-size: 9pt;">${challan.lot_no}</td>
        </tr>
        <tr>
          <td class="lbl">Fabric Quality:</td>
          <td class="val font-bold">${challan.fabric_quality}</td>
        </tr>
        <tr>
          <td class="lbl">Lot Status:</td>
          <td class="val font-bold">${challan.status.replace(/_/g, ' ')}</td>
        </tr>
      </table>
    </div>
  </div>

  <!-- Items Table -->
  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 5%;">Sr.</th>
        <th style="width: 25%;">Design No / Pattern</th>
        <th style="width: 24%;">Fabric Particulars</th>
        <th style="width: 9%; text-align: center;">Thans</th>
        <th style="width: 14%; text-align: right;">Inward Meters</th>
        <th style="width: 12%; text-align: right;">Stitches/Pc</th>
        <th style="width: 11%; text-align: right;">Rate / 1k</th>
      </tr>
    </thead>
    <tbody>
      ${itemRowsHtml}
      <tr class="total-row">
        <td colspan="3" class="text-right font-bold">TOTAL INWARD QUANTITY:</td>
        <td class="text-center font-mono font-bold">${sumThans} Thans</td>
        <td class="text-right font-mono font-bold">${Number(challan.inward_meters || sumMeters).toFixed(2)} m</td>
        <td class="text-right font-mono font-bold">${sumStitches > 0 ? sumStitches.toLocaleString('en-IN') : '—'}</td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <!-- Footer Remarks & Terms -->
  <div class="footer-box">
    <div class="notes-col">
      <div class="sec-label">Special Job-Work Notes / Production Remarks:</div>
      <div style="font-size: 7.2pt; color: #222; min-height: 35px;">
        ${challan.notes || 'Goods received for embroidery job-work as per standard quality and count.'}
      </div>
    </div>
    <div class="terms-col">
      <div class="sec-label">Terms of Job-Work Movement:</div>
      <div style="font-size: 6.4pt; color: #333; line-height: 1.25;">
        1. Raw grey fabric received solely for processing/embroidery job-work under GST SAC 9988.<br>
        2. Inward meters and than counts subject to machine verification and checking.<br>
        3. Standard Surat textile processing shrinkage tolerance (≤ 3.0%) applicable.<br>
        4. Subject to Surat jurisdiction only.
      </div>
    </div>
  </div>

  <!-- Signatures -->
  <div class="signatures-grid">
    <div class="sign-col">
      <div style="font-size: 7.2pt; font-weight: bold; text-transform: uppercase;">
        Delivered By / Transporter's Sign
      </div>
      <div class="sign-space"></div>
      <div style="font-size: 7.2pt; border-top: 0.5px solid #000; padding-top: 2px;">
        Signature of Trader / Driver
      </div>
    </div>
    <div class="sign-col">
      <div style="font-size: 7.2pt; font-weight: bold; text-transform: uppercase;">
        For ${company.name}
      </div>
      <div class="sign-space"></div>
      <div style="font-size: 7.2pt; border-top: 0.5px solid #000; padding-top: 2px;">
        Authorised Receiver & QC In-charge
      </div>
    </div>
  </div>
</div>

</body>
</html>`.trim();
}