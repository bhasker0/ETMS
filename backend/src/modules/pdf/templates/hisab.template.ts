function numberToWords(num: number): string {
  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
    'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const n = Math.floor(Math.abs(num));
  if (n === 0) return 'Zero Rupees Only';

  const inWords = (val: number): string => {
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
        str += b[Math.floor(val / 10)] + ' ' + a[val % 10];
      }
    }
    return str;
  };

  const result = inWords(n).trim();
  return (num < 0 ? 'Minus ' : '') + 'Rupees ' + result + ' Only';
}

export function generateHisabHtml(data: {
  company: {
    name: string;
    phone: string;
    gstin?: string;
    address?: string;
  };
  karigar: {
    name: string;
    mobile: string;
    wage_type: string;
    rate_per_meter: number;
    monthly_salary: number;
  };
  hisabPeriod: {
    startDate: string;
    endDate: string;
    fortnightLabel: string;
  };
  summary: {
    totalMeters: number;
    totalStitches: number;
    shiftsCount: number;
    grossEarnings: number;
    totalUchapatAdvances: number;
    deductions: number;
    deduction_reason?: string;
    netPayable: number;
  };
  attendance?: {
    total_period_days: number;
    attended_days: number;
    absent_days: number;
    daily_base_salary: number;
    suggested_absent_deduction: number;
  };
  shifts: Array<{
    shift_date: string;
    shift_type: string;
    machine_no: string;
    design_no?: string;
    total_meters: number;
    total_stitches: number;
    commission_rate?: number;
    applied_basis?: string;
    shift_earnings?: number;
  }>;
  uchapats: Array<{
    date: string;
    amount: number;
    reason?: string;
    payment_mode?: string;
  }>;
}): string {
  const { company, karigar, hisabPeriod, summary, attendance, shifts, uchapats } = data;
  const netWords = numberToWords(summary.netPayable);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Karigar Fortnight Wage Hisab - ${karigar.name}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 6mm 6mm 12mm 6mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #111111;
      margin: 0;
      padding: 0;
      font-size: 8.5pt;
      line-height: 1.35;
      background: #ffffff;
    }
    .sheet {
      width: 100%;
      border: 1.5px solid #111111;
      padding: 8px 10px;
    }
    
    /* Header */
    .company-header {
      border-bottom: 1.5px solid #111111;
      padding-bottom: 6px;
      margin-bottom: 6px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .company-title {
      font-size: 14pt;
      font-weight: 800;
      letter-spacing: -0.3px;
      text-transform: uppercase;
      margin: 0;
    }
    .company-meta {
      font-size: 7.5pt;
      color: #333333;
      margin-top: 2px;
    }
    .doc-badge {
      text-align: right;
    }
    .doc-name {
      font-size: 11pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #111111;
    }
    .doc-sub {
      font-size: 7pt;
      color: #555555;
      margin-top: 1px;
    }

    /* Karigar & Period Grid */
    .meta-grid {
      display: grid;
      grid-template-columns: 1.3fr 1fr;
      border: 1px solid #222222;
      background: #fafafa;
      margin-bottom: 8px;
    }
    .meta-col {
      padding: 6px 8px;
    }
    .meta-col:first-child {
      border-right: 1px solid #222222;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
      font-size: 8pt;
    }
    .meta-row:last-child {
      margin-bottom: 0;
    }
    .meta-label {
      color: #555555;
      font-weight: 500;
    }
    .meta-val {
      font-weight: 700;
      color: #111111;
    }

    /* Production Summary Highlights */
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 5px;
      margin-bottom: 8px;
    }
    .kpi-card {
      border: 1px solid #333333;
      padding: 4px 6px;
      text-align: center;
      background: #ffffff;
    }
    .kpi-label {
      font-size: 6.8pt;
      text-transform: uppercase;
      font-weight: 600;
      color: #555555;
    }
    .kpi-val {
      font-size: 10pt;
      font-weight: 800;
      font-family: 'Courier New', Courier, monospace;
      color: #000000;
      margin-top: 1px;
    }
    .kpi-sub {
      font-size: 6.5pt;
      color: #666666;
    }

    /* Section Titles */
    .section-head {
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      background: #eeeeee;
      padding: 3px 6px;
      border: 1px solid #222222;
      border-bottom: none;
      margin-top: 6px;
      display: flex;
      justify-content: space-between;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 6px;
      font-size: 7.8pt;
    }
    table th, table td {
      border: 1px solid #222222;
      padding: 3.5px 5px;
      vertical-align: middle;
    }
    table th {
      background: #f2f2f2;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 7pt;
      letter-spacing: 0.2px;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .mono { font-family: 'Courier New', Courier, monospace; }

    /* Reconciliation Box */
    .recon-box {
      border: 1.5px solid #000000;
      margin-top: 6px;
      background: #fafafa;
    }
    .recon-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 8px;
      border-bottom: 1px solid #dddddd;
      font-size: 8pt;
    }
    .recon-row:last-child {
      border-bottom: none;
    }
    .recon-label {
      font-weight: 600;
    }
    .recon-val {
      font-weight: 700;
      font-family: 'Courier New', Courier, monospace;
    }
    .net-payable-row {
      background: #f0fdf4;
      border-top: 1.5px solid #16a34a !important;
      padding: 6px 8px;
      font-size: 9.5pt;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .net-payable-title {
      font-weight: 800;
      color: #14532d;
    }
    .net-payable-amt {
      font-size: 13pt;
      font-weight: 900;
      color: #15803d;
      font-family: 'Courier New', Courier, monospace;
    }

    .words-box {
      border-top: 1px dashed #999999;
      padding: 3px 8px;
      font-size: 7.5pt;
      font-weight: 600;
      color: #333333;
      background: #ffffff;
    }

    /* Signatures */
    .sign-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-top: 25px;
      padding: 0 10px;
      page-break-inside: avoid;
    }
    .sign-box {
      border-top: 1px solid #111111;
      text-align: center;
      padding-top: 4px;
      font-size: 7.5pt;
      font-weight: 600;
    }
    .sign-sub {
      font-size: 6.8pt;
      color: #666666;
      font-weight: normal;
    }
  </style>
</head>
<body>
  <div class="sheet">
    <!-- Header -->
    <div class="company-header">
      <div>
        <h1 class="company-title">${company.name || 'Surat Embroidery Works'}</h1>
        <div class="company-meta">
          ${company.address ? `${company.address} • ` : ''}Phone: ${company.phone || 'N/A'}${company.gstin ? ` • GSTIN: ${company.gstin}` : ''}
        </div>
      </div>
      <div class="doc-badge">
        <div class="doc-name">Wage Hisab Slip</div>
        <div class="doc-sub">કારીગર પખવાડિયા હિસાબ રસીદ</div>
      </div>
    </div>

    <!-- Karigar & Fortnight Metadata -->
    <div class="meta-grid">
      <div class="meta-col">
        <div class="meta-row">
          <span class="meta-label">Karigar Name:</span>
          <span class="meta-val">${karigar.name}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Mobile Number:</span>
          <span class="meta-val">${karigar.mobile || 'N/A'}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Wage Model:</span>
          <span class="meta-val">${karigar.wage_type === 'PIECE_RATE' ? `Piece-Rate (@ ₹${karigar.rate_per_meter}/meter)` : `Fixed Monthly (@ ₹${karigar.monthly_salary}/mo)`}</span>
        </div>
      </div>

      <div class="meta-col">
        <div class="meta-row">
          <span class="meta-label">Fortnight Period:</span>
          <span class="meta-val">${hisabPeriod.startDate} to ${hisabPeriod.endDate}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Fortnight Term:</span>
          <span class="meta-val">${hisabPeriod.fortnightLabel}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Attendance:</span>
          <span class="meta-val">
            ${attendance ? `${attendance.attended_days} Days Worked (${attendance.absent_days} Absent)` : `${summary.shiftsCount} Shifts Logged`}
          </span>
        </div>
      </div>
    </div>

    <!-- Financial KPI Bar -->
    <div class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-label">1. Gross Earnings</div>
        <div class="kpi-val">₹${Number(summary.grossEarnings).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        <div class="kpi-sub">${summary.shiftsCount} Shifts • ${Number(summary.totalMeters).toFixed(1)}m</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">2. Uchapat Advances</div>
        <div class="kpi-val" style="color: #b91c1c;">- ₹${Number(summary.totalUchapatAdvances).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        <div class="kpi-sub">${uchapats.length} Recovered Advances</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">3. Deductions</div>
        <div class="kpi-val" style="color: #b45309;">- ₹${Number(summary.deductions).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        <div class="kpi-sub">${summary.deduction_reason ? summary.deduction_reason.substring(0, 20) : 'None'}</div>
      </div>
      <div class="kpi-card" style="border-color: #15803d; background: #f0fdf4;">
        <div class="kpi-label" style="color: #14532d;">Net Salary Payable</div>
        <div class="kpi-val" style="color: #15803d;">₹${Number(summary.netPayable).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        <div class="kpi-sub" style="color: #15803d;">Final Settlement</div>
      </div>
    </div>

    <!-- 1. Production Shifts Table -->
    <div class="section-head">
      <span>1. Shift Production Breakdown (શિફ્ટવાર ઉત્પાદન હિસાબ)</span>
      <span>Total Output: ${Number(summary.totalMeters).toFixed(2)} m • ${Number(summary.totalStitches).toLocaleString('en-IN')} Stitches</span>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width: 25px;" class="text-center">Sr</th>
          <th style="width: 70px;">Date</th>
          <th style="width: 55px;">Shift</th>
          <th style="width: 50px;" class="text-center">Machine</th>
          <th>Design No</th>
          <th style="width: 80px;" class="text-right">Stitches</th>
          <th style="width: 70px;" class="text-right">Meters</th>
          <th style="width: 100px;">Rate / Basis</th>
          <th style="width: 75px;" class="text-right">Earnings (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${shifts.length > 0 ? shifts.map((s, idx) => `
          <tr>
            <td class="text-center">${idx + 1}</td>
            <td>${s.shift_date}</td>
            <td>${s.shift_type}</td>
            <td class="text-center">#${s.machine_no}</td>
            <td>${s.design_no || '-'}</td>
            <td class="text-right mono">${Number(s.total_stitches).toLocaleString('en-IN')}</td>
            <td class="text-right mono">${Number(s.total_meters).toFixed(2)}</td>
            <td>${s.applied_basis || (s.commission_rate ? `₹${s.commission_rate}/m` : '-')}</td>
            <td class="text-right mono font-bold">₹${Number(s.shift_earnings || 0).toFixed(2)}</td>
          </tr>
        `).join('') : `
          <tr>
            <td colspan="9" class="text-center" style="color: #888888; padding: 8px;">No shifts logged in this period</td>
          </tr>
        `}
      </tbody>
      ${shifts.length > 0 ? `
      <tfoot>
        <tr style="font-weight: 700; background: #f8f8f8;">
          <td colspan="5" class="text-right">Total Production Output:</td>
          <td class="text-right mono">${Number(summary.totalStitches).toLocaleString('en-IN')}</td>
          <td class="text-right mono">${Number(summary.totalMeters).toFixed(2)} m</td>
          <td class="text-right">Total Earnings:</td>
          <td class="text-right mono font-bold">₹${Number(summary.grossEarnings).toFixed(2)}</td>
        </tr>
      </tfoot>` : ''}
    </table>

    <!-- 2. Uchapat Advances Recovered Table -->
    <div class="section-head">
      <span>2. Recovered Uchapat Advances (વસૂલ લીધેલ ઉપાડ / એડવાન્સ)</span>
      <span>${uchapats.length} Records Totaling ₹${Number(summary.totalUchapatAdvances).toFixed(2)}</span>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width: 25px;" class="text-center">Sr</th>
          <th style="width: 80px;">Date</th>
          <th>Reason / Reference</th>
          <th style="width: 90px;">Payment Mode</th>
          <th style="width: 85px;" class="text-right">Recovered Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${uchapats.length > 0 ? uchapats.map((u, idx) => `
          <tr>
            <td class="text-center">${idx + 1}</td>
            <td>${u.date}</td>
            <td>${u.reason || 'Karigar Advance'}</td>
            <td>${u.payment_mode || 'CASH'}</td>
            <td class="text-right mono" style="color: #b91c1c; font-weight: 600;">- ₹${Number(u.amount).toFixed(2)}</td>
          </tr>
        `).join('') : `
          <tr>
            <td colspan="5" class="text-center" style="color: #888888; padding: 6px;">Zero Uchapat advances recovered in this fortnight period</td>
          </tr>
        `}
      </tbody>
      ${uchapats.length > 0 ? `
      <tfoot>
        <tr style="font-weight: 700; background: #f8f8f8;">
          <td colspan="4" class="text-right">Total Advances Recovered:</td>
          <td class="text-right mono" style="color: #b91c1c; font-weight: 800;">- ₹${Number(summary.totalUchapatAdvances).toFixed(2)}</td>
        </tr>
      </tfoot>` : ''}
    </table>

    <!-- 3. Final Reconciliation Statement -->
    <div class="recon-box">
      <div class="recon-row">
        <span class="recon-label">A. Gross Fortnight Wages / Production Output</span>
        <span class="recon-val">₹${Number(summary.grossEarnings).toFixed(2)}</span>
      </div>
      <div class="recon-row" style="color: #b91c1c;">
        <span class="recon-label">B. Less: Recovered Uchapat Advances (${uchapats.length} Vouchers)</span>
        <span class="recon-val">- ₹${Number(summary.totalUchapatAdvances).toFixed(2)}</span>
      </div>
      <div class="recon-row" style="color: #b45309;">
        <span class="recon-label">
          C. Less: Defect / Absent Deductions ${summary.deduction_reason ? `(${summary.deduction_reason})` : ''}
        </span>
        <span class="recon-val">- ₹${Number(summary.deductions).toFixed(2)}</span>
      </div>
      <div class="net-payable-row">
        <div>
          <div class="net-payable-title">NET PAYABLE WAGE / SALARY (ચૂકવવાપાત્ર ચોખ્ખો પગાર):</div>
          <div style="font-size: 7.2pt; color: #166534; margin-top: 1px;">Full and final settlement for the period</div>
        </div>
        <div class="net-payable-amt">₹${Number(summary.netPayable).toFixed(2)}</div>
      </div>
      <div class="words-box">
        Amount in Words: <em>${netWords}</em>
      </div>
    </div>

    <!-- Signatures Block -->
    <div class="sign-row">
      <div class="sign-box">
        Karigar Signature / Thumb Impression<br>
        <span class="sign-sub">કારીગરની સહી / અંગૂઠાનું નિશાન</span>
      </div>
      <div class="sign-box">
        Authorized Signatory / Munimji<br>
        <span class="sign-sub">માટે: ${company.name || 'Surat Embroidery Works'} (મુનીમ / મેનેજર)</span>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}
