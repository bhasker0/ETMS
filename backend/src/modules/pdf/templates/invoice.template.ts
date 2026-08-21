export function generateInvoiceHtml(data: {
  company: {
    name: string;
    gstin: string;
    address: string;
    phone: string;
  };
  invoice: {
    invoice_no: string;
    invoice_date: string;
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
    gst_5_percent: number;
    net_amount: number;
    inward_meters: number;
    outward_meters: number;
    shrinkage_percent: number;
    is_shrinkage_exceeded: boolean;
    shrinkage_warning?: string;
  };
  challan: {
    challan_no: string;
    lot_no: string;
    than_count: number;
    fabric_quality: string;
    design_no: string;
  };
}): string {
  const { company, invoice, challan } = data;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>GST Job-Work Tax Invoice - ${invoice.invoice_no}</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #333;
      margin: 0;
      padding: 0;
      font-size: 13px;
      line-height: 1.4;
    }
    .invoice-box {
      border: 1.5px solid #1a365d;
      padding: 15px;
      border-radius: 4px;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #1a365d;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }
    .header h1 {
      margin: 0;
      font-size: 22px;
      color: #1a365d;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .header .sub-title {
      font-size: 11px;
      color: #4a5568;
      margin-top: 3px;
    }
    .header .tagline {
      font-weight: bold;
      color: #2b6cb0;
      font-size: 13px;
    }
    .info-grid {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    .info-col {
      width: 48%;
      background: #f7fafc;
      padding: 8px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
    }
    .info-col h3 {
      margin: 0 0 6px 0;
      font-size: 13px;
      color: #2d3748;
      border-bottom: 1px solid #cbd5e0;
      padding-bottom: 3px;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      margin-bottom: 15px;
    }
    table.data-table th, table.data-table td {
      border: 1px solid #cbd5e0;
      padding: 8px 10px;
      text-align: left;
    }
    table.data-table th {
      background-color: #2b6cb0;
      color: white;
      font-weight: 600;
      font-size: 12px;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .calculation-box {
      margin-left: auto;
      width: 50%;
      border: 1px solid #cbd5e0;
      background: #f7fafc;
      border-radius: 4px;
    }
    .calculation-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    .calculation-row.total {
      font-size: 15px;
      font-weight: bold;
      background: #2b6cb0;
      color: white;
    }
    .shrinkage-alert {
      margin-top: 12px;
      padding: 8px 12px;
      background-color: #fffaf0;
      border-left: 4px solid #dd6b20;
      color: #9c4221;
      font-size: 12px;
      font-weight: 600;
    }
    .shrinkage-ok {
      margin-top: 12px;
      padding: 8px 12px;
      background-color: #f0fff4;
      border-left: 4px solid #38a169;
      color: #22543d;
      font-size: 12px;
    }
    .footer-signatures {
      margin-top: 40px;
      display: flex;
      justify-content: space-between;
      padding-top: 20px;
    }
    .sign-box {
      width: 40%;
      text-align: center;
      border-top: 1px dashed #718096;
      padding-top: 5px;
      font-size: 12px;
      color: #4a5568;
    }
  </style>
</head>
<body>
  <div class="invoice-box">
    <div class="header">
      <div class="tagline">GST SAC 9988 - JOB WORK TAX INVOICE & DELIVERY CHALLAN</div>
      <h1>${company.name}</h1>
      <div class="sub-title">
        ${company.address || 'Ring Road / Khatodara GIDC, Surat, Gujarat - 395002'}<br>
        <strong>GSTIN:</strong> ${company.gstin} | <strong>Phone:</strong> ${company.phone || 'N/A'}
      </div>
    </div>

    <div class="info-grid">
      <div class="info-col">
        <h3>Billed / Dispatched To (Trader):</h3>
        <strong>${invoice.trader_name}</strong><br>
        <strong>GSTIN:</strong> ${invoice.trader_gstin || 'URP / Consumer'}<br>
        <strong>Place of Supply:</strong> Gujarat (24)
      </div>
      <div class="info-col">
        <h3>Invoice & Challan Details:</h3>
        <strong>Invoice No:</strong> ${invoice.invoice_no}<br>
        <strong>Invoice Date:</strong> ${invoice.invoice_date}<br>
        <strong>Inward Ref Challan:</strong> ${challan.challan_no} (Lot: ${challan.lot_no})<br>
        <strong>Fabric Quality:</strong> ${challan.fabric_quality} | Than: ${challan.than_count}
      </div>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th>Sr.</th>
          <th>Description of Job Work</th>
          <th class="text-center">SAC</th>
          <th class="text-center">Design No</th>
          <th class="text-center">Heads</th>
          <th class="text-right">Stitches</th>
          <th class="text-right">Rate / 1000</th>
          <th class="text-right">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="text-center">1</td>
          <td>
            Embroidery Job-Work on Fabric<br>
            <small style="color: #718096;">[Math: (${invoice.total_stitches} / 1000) × ₹${invoice.rate_per_1000} × ${invoice.machine_heads} Heads]</small>
          </td>
          <td class="text-center">${invoice.sac_code || '9988'}</td>
          <td class="text-center">${challan.design_no}</td>
          <td class="text-center">${invoice.machine_heads}</td>
          <td class="text-right">${Number(invoice.total_stitches).toLocaleString('en-IN')}</td>
          <td class="text-right">₹${Number(invoice.rate_per_1000).toFixed(4)}</td>
          <td class="text-right">₹${Number(invoice.gross_amount).toFixed(2)}</td>
        </tr>
      </tbody>
    </table>

    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
      <div style="width: 46%;">
        <div style="background: #edf2f7; padding: 10px; border-radius: 4px; border: 1px solid #cbd5e0;">
          <h4 style="margin: 0 0 5px 0; font-size: 12px; color: #2d3748;">Meters & Shrinkage Reconciliation:</h4>
          <div><strong>Inward Meters:</strong> ${Number(invoice.inward_meters).toFixed(2)} m</div>
          <div><strong>Outward Meters:</strong> ${Number(invoice.outward_meters).toFixed(2)} m</div>
          <div><strong>Shrinkage %:</strong> ${Number(invoice.shrinkage_percent).toFixed(2)}%</div>
          ${
            invoice.is_shrinkage_exceeded
              ? `<div class="shrinkage-alert">⚠️ WARNING: ${invoice.shrinkage_warning || 'Shrinkage exceeds 3% tolerance!'}</div>`
              : `<div class="shrinkage-ok">✓ Shrinkage is within acceptable Surat textile limit (≤ 3.0%)</div>`
          }
        </div>
      </div>

      <div class="calculation-box">
        <div class="calculation-row">
          <span>Gross Job-Work Amount:</span>
          <strong>₹${Number(invoice.gross_amount).toFixed(2)}</strong>
        </div>
        ${
          invoice.igst_amount > 0
            ? `<div class="calculation-row">
                <span>IGST (5.0%):</span>
                <span>₹${Number(invoice.igst_amount).toFixed(2)}</span>
               </div>`
            : `<div class="calculation-row">
                <span>CGST (2.5%):</span>
                <span>₹${Number(invoice.cgst_amount).toFixed(2)}</span>
               </div>
               <div class="calculation-row">
                <span>SGST (2.5%):</span>
                <span>₹${Number(invoice.sgst_amount).toFixed(2)}</span>
               </div>`
        }
        <div class="calculation-row">
          <span>Total GST (5% SAC 9988):</span>
          <span>₹${Number(invoice.gst_5_percent).toFixed(2)}</span>
        </div>
        <div class="calculation-row total">
          <span>Net Payable Amount:</span>
          <span>₹${Number(invoice.net_amount).toFixed(2)}</span>
        </div>
      </div>
    </div>

    <div class="footer-signatures">
      <div class="sign-box">
        Receiver's Signature & Stamp
      </div>
      <div class="sign-box">
        For <strong>${company.name}</strong><br><br>
        Authorized Signatory
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}
