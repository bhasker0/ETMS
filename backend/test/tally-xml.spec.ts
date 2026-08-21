import { buildTallyPrimeXml } from '../src/modules/tally/tally-xml.builder';

describe('Tally Prime XML Builder', () => {
  it('should generate valid Tally XML matching <ENVELOPE><BODY><IMPORTDATA><TALLYMESSAGE>', () => {
    const xml = buildTallyPrimeXml('Radhe Krishna Embroidery Works', [
      {
        guid: 'ETMS-TEST-001',
        invoice_no: 'INV-2026-0001',
        invoice_date: '2026-08-15',
        trader_name: 'Vandana Silk Mills Pvt Ltd',
        sac_code: '9988',
        machine_heads: 32,
        total_stitches: 450000,
        rate_per_1000: 0.35,
        gross_amount: 5040.0,
        cgst_amount: 126.0,
        sgst_amount: 126.0,
        igst_amount: 0,
        net_amount: 5292.0,
        inward_meters: 1000.0,
        outward_meters: 975.0,
        challan_no: 'CH-2026-0001',
        lot_no: 'LOT-8891',
      },
    ]);

    expect(xml).toContain('<ENVELOPE>');
    expect(xml).toContain('<TALLYREQUEST>Import Data</TALLYREQUEST>');
    expect(xml).toContain('<SVCURRENTCOMPANY>Radhe Krishna Embroidery Works</SVCURRENTCOMPANY>');
    expect(xml).toContain('<TALLYMESSAGE xmlns:UDF="TallyUDF">');
    expect(xml).toContain('<VOUCHER VCHTYPE="Sales" ACTION="Create"');
    expect(xml).toContain('<DATE>20260815</DATE>');
    expect(xml).toContain('<VOUCHERNUMBER>INV-2026-0001</VOUCHERNUMBER>');
    expect(xml).toContain('<PARTYLEDGERNAME>Vandana Silk Mills Pvt Ltd</PARTYLEDGERNAME>');
    expect(xml).toContain('<LEDGERNAME>Embroidery Job Work (SAC 9988)</LEDGERNAME>');
    expect(xml).toContain('<LEDGERNAME>Output CGST 2.5%</LEDGERNAME>');
    expect(xml).toContain('<LEDGERNAME>Output SGST 2.5%</LEDGERNAME>');
    expect(xml).toContain('<AMOUNT>-5292.00</AMOUNT>'); // Debit party ledger
    expect(xml).toContain('<AMOUNT>5040.00</AMOUNT>'); // Credit jobwork sales
    expect(xml).toContain('<AMOUNT>126.00</AMOUNT>'); // Credit CGST
    expect(xml).toContain('<AMOUNT>126.00</AMOUNT>'); // Credit SGST
  });

  it('should generate valid IGST ledger entries for inter-state transactions', () => {
    const xml = buildTallyPrimeXml('Radhe Krishna Embroidery Works', [
      {
        guid: 'ETMS-TEST-002',
        invoice_no: 'INV-2026-0002',
        invoice_date: '2026-08-16',
        trader_name: 'Mumbai Fashion Fabrics Ltd',
        sac_code: '9988',
        machine_heads: 32,
        total_stitches: 200000,
        rate_per_1000: 0.35,
        gross_amount: 2240.0,
        cgst_amount: 0,
        sgst_amount: 0,
        igst_amount: 112.0,
        net_amount: 2352.0,
        inward_meters: 500.0,
        outward_meters: 490.0,
      },
    ]);

    expect(xml).toContain('<LEDGERNAME>Output IGST 5.0%</LEDGERNAME>');
    expect(xml).toContain('<AMOUNT>112.00</AMOUNT>');
    expect(xml).not.toContain('<LEDGERNAME>Output CGST 2.5%</LEDGERNAME>');
  });
});
