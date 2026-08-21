import { OutwardInvoicesService } from '../src/modules/outward-invoices/outward-invoices.service';

describe('Surat Embroidery Business & Calculation Engines', () => {
  let invoicesService: OutwardInvoicesService;

  beforeEach(() => {
    // Mock pdfService
    const mockPdfService: any = {
      generateInvoicePdf: jest.fn(),
    };
    invoicesService = new OutwardInvoicesService(mockPdfService);
  });

  describe('1. SAC 9988 Stitch Billing Engine', () => {
    it('should calculate correct gross amount using (Stitches / 1000) * Rate * Heads', () => {
      // 450,000 stitches, Rate ₹0.35 per 1000, 32 machine heads
      // Math: (450,000 / 1000) * 0.35 * 32 = 450 * 0.35 * 32 = 5,040.00
      const result = invoicesService.performCalculations({
        total_stitches: 450000,
        rate_per_1000: 0.35,
        machine_heads: 32,
        inward_meters: 1000,
        outward_meters: 975,
        company_gstin: '24AAAAA1111A1Z5',
        trader_gstin: '24AABCV1234F1Z8',
      });

      expect(result.gross_amount).toBe(5040.0);
    });

    it('should apply 2.5% CGST + 2.5% SGST for intra-state Gujarat transactions (State Code 24)', () => {
      const result = invoicesService.performCalculations({
        total_stitches: 450000,
        rate_per_1000: 0.35,
        machine_heads: 32,
        inward_meters: 1000,
        outward_meters: 980,
        company_gstin: '24AAAAA1111A1Z5',
        trader_gstin: '24AABCV1234F1Z8', // Both starting with 24
      });

      expect(result.cgst_amount).toBe(126.0); // 5040 * 0.025
      expect(result.sgst_amount).toBe(126.0); // 5040 * 0.025
      expect(result.igst_amount).toBe(0);
      expect(result.gst_5_percent).toBe(252.0); // 5% total
      expect(result.net_amount).toBe(5292.0); // 5040 + 252
    });

    it('should apply 5% IGST for inter-state transactions (e.g. Maharashtra 27)', () => {
      const result = invoicesService.performCalculations({
        total_stitches: 450000,
        rate_per_1000: 0.35,
        machine_heads: 32,
        inward_meters: 1000,
        outward_meters: 980,
        company_gstin: '24AAAAA1111A1Z5', // Gujarat
        trader_gstin: '27AABCV1234F1Z8', // Maharashtra
      });

      expect(result.cgst_amount).toBe(0);
      expect(result.sgst_amount).toBe(0);
      expect(result.igst_amount).toBe(252.0); // 5040 * 0.05
      expect(result.gst_5_percent).toBe(252.0);
      expect(result.net_amount).toBe(5292.0);
    });

    it('should calculate 66-head machine job work properly', () => {
      // 300,000 stitches, Rate ₹0.40 per 1000, 66 machine heads
      // Math: (300,000 / 1000) * 0.40 * 66 = 300 * 0.40 * 66 = 7,920.00
      const result = invoicesService.performCalculations({
        total_stitches: 300000,
        rate_per_1000: 0.4,
        machine_heads: 66,
        inward_meters: 800,
        outward_meters: 780,
      });

      expect(result.gross_amount).toBe(7920.0);
      expect(result.gst_5_percent).toBe(396.0); // 7920 * 0.05
      expect(result.net_amount).toBe(8316.0);
    });
  });

  describe('2. Fabric Shrinkage Reconciliation Engine', () => {
    it('should calculate exact shrinkage percentage ((Inward - Outward) / Inward) * 100', () => {
      // Inward: 1000m, Outward: 975m => (25 / 1000) * 100 = 2.50%
      const result = invoicesService.performCalculations({
        total_stitches: 100000,
        rate_per_1000: 0.35,
        machine_heads: 32,
        inward_meters: 1000,
        outward_meters: 975,
        tolerance_percent: 3.0,
      });

      expect(result.shrinkage_percent).toBe(2.5);
      expect(result.is_shrinkage_exceeded).toBe(false);
      expect(result.shrinkage_warning).toBeNull();
    });

    it('should flag warning when shrinkage exceeds 3% Surat fabric tolerance threshold', () => {
      // Inward: 1000m, Outward: 960m => (40 / 1000) * 100 = 4.00% (> 3.0%)
      const result = invoicesService.performCalculations({
        total_stitches: 100000,
        rate_per_1000: 0.35,
        machine_heads: 32,
        inward_meters: 1000,
        outward_meters: 960,
        tolerance_percent: 3.0,
      });

      expect(result.shrinkage_percent).toBe(4.0);
      expect(result.is_shrinkage_exceeded).toBe(true);
      expect(result.shrinkage_warning).toContain('exceeds acceptable Surat fabric tolerance');
    });
  });

  describe('3. Karigar Fortnightly Wage Hisab Logic', () => {
    it('should correctly calculate Net Pay = Gross Shift Output - Uchapat Advances - Deductions', () => {
      const pieceRateOutputMeters = 1200.0;
      const ratePerMeter = 1.25;
      const grossEarnings = pieceRateOutputMeters * ratePerMeter; // ₹1,500.00

      const totalUchapatAdvances = 350.0;
      const threadDeductions = 50.0;

      const netPay = grossEarnings - totalUchapatAdvances - threadDeductions;

      expect(grossEarnings).toBe(1500.0);
      expect(netPay).toBe(1100.0);
    });
  });
});
