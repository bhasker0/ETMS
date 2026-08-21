export function generateHisabHtml(data: {
  company: {
    name: string;
    phone: string;
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
    netPayable: number;
  };
  shifts: Array<{
    shift_date: string;
    shift_type: string;
    machine_no: string;
    design_no: string;
    total_meters: number;
    total_stitches: number;
  }>;
  uchapats: Array<{
    date: string;
    amount: number;
    reason: string;
    payment_mode: string;
  }>;
}): string {
  const { company, karigar, hisabPeriod, summary, shifts, uchapats } = data;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Karigar Fortnightly Wage Hisab - ${karigar.name}</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #2d3748;
      margin: 0;
      padding: 0;
      font-size: 12px;
    }
    .hisab-container {
      border: 1px solid #718096;
      padding: 15px;
      border-radius: 4px;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #2b6cb0;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .header h2 {
      margin: 0;
      font-size: 18px;
      color: #2b6cb0;
    }
    .header .subtitle {
      font-size: 11px;
      color: #4a5568;
    }
    .section-title {
      font-weight: bold;
      font-size: 13px;
      color: #2b6cb0;
      margin: 10px 0 5px 0;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 2px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
    }
    table th, table td {
      border: 1px solid #cbd5e0;
      padding: 5px 8px;
      text-align: left;
    }
    table th {
      background: #edf2f7;
      font-weight: 600;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .net-box {
      margin-top: 15px;
      background: #ebf8ff;
      border: 1.5px solid #3182ce;
      padding: 12px;
      border-radius: 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .net-box .label {
      font-size: 14px;
      font-weight: bold;
      color: #2b6cb0;
    }
    .net-box .amount {
      font-size: 20px;
      font-weight: bold;
      color: #2c5282;
    }
  </style>
</head>
<body>
  <div class="hisab-container">
    <div class="header">
      <h2>${company.name} - Karigar Fortnightly Hisab (કારીગર હિસાબ)</h2>
      <div class="subtitle">
        Period: <strong>${hisabPeriod.startDate}</strong> to <strong>${hisabPeriod.endDate}</strong> (${hisabPeriod.fortnightLabel})
      </div>
    </div>

    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
      <div>
        <strong>Karigar Name:</strong> ${karigar.name}<br>
        <strong>Mobile:</strong> ${karigar.mobile || 'N/A'}<br>
        <strong>Wage Type:</strong> ${karigar.wage_type} ${karigar.wage_type === 'PIECE_RATE' ? `(@ ₹${karigar.rate_per_meter}/meter)` : `(@ ₹${karigar.monthly_salary}/month)`}
      </div>
      <div style="text-align: right;">
        <strong>Total Shifts:</strong> ${summary.shiftsCount}<br>
        <strong>Total Output Meters:</strong> ${Number(summary.totalMeters).toFixed(2)} m<br>
        <strong>Total Stitches:</strong> ${Number(summary.totalStitches).toLocaleString('en-IN')}
      </div>
    </div>

    <div class="section-title">1. Shift Production Summary (ઉત્પાદન)</div>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Shift</th>
          <th>Machine</th>
          <th>Design</th>
          <th class="text-right">Stitches</th>
          <th class="text-right">Meters</th>
        </tr>
      </thead>
      <tbody>
        ${shifts
          .map(
            (s) => `
          <tr>
            <td>${s.shift_date}</td>
            <td>${s.shift_type}</td>
            <td>${s.machine_no}</td>
            <td>${s.design_no}</td>
            <td class="text-right">${Number(s.total_stitches).toLocaleString('en-IN')}</td>
            <td class="text-right">${Number(s.total_meters).toFixed(2)}</td>
          </tr>
        `,
          )
          .join('')}
      </tbody>
    </table>

    <div class="section-title">2. Uchapat / Advance Deductions (ઉપાડ)</div>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Reason</th>
          <th>Mode</th>
          <th class="text-right">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${
          uchapats.length > 0
            ? uchapats
                .map(
                  (u) => `
              <tr>
                <td>${u.date}</td>
                <td>${u.reason}</td>
                <td>${u.payment_mode}</td>
                <td class="text-right">₹${Number(u.amount).toFixed(2)}</td>
              </tr>
            `,
                )
                .join('')
            : `<tr><td colspan="4" class="text-center" style="color:#718096;">No Uchapat advances in this fortnight period</td></tr>`
        }
      </tbody>
    </table>

    <div class="net-box">
      <div>
        <div><strong>Gross Piece-Rate Earnings:</strong> ₹${Number(summary.grossEarnings).toFixed(2)}</div>
        <div><strong>Less Uchapat (Advance):</strong> - ₹${Number(summary.totalUchapatAdvances).toFixed(2)}</div>
        <div><strong>Less Deductions (Thread/Other):</strong> - ₹${Number(summary.deductions).toFixed(2)}</div>
      </div>
      <div style="text-align: right;">
        <div class="label">NET PAYABLE (ચૂકવવાપાત્ર રકમ):</div>
        <div class="amount">₹${Number(summary.netPayable).toFixed(2)}</div>
      </div>
    </div>

    <div style="display: flex; justify-content: space-between; margin-top: 30px;">
      <div style="border-top: 1px dashed #718096; width: 40%; text-align: center; padding-top: 5px;">
        Karigar Signature (કારીગરની સહી)
      </div>
      <div style="border-top: 1px dashed #718096; width: 40%; text-align: center; padding-top: 5px;">
        Manager / Munim Signature
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}
