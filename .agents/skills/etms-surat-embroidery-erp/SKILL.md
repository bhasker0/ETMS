---
name: etms-surat-embroidery-erp
description: Expert domain guidelines for Surat Embroidery Micro-ERP backend (SAC 9988 GST billing, Karigar fortnightly wage hisab, Munim handshake, and Tally Prime XML export).
---

# Surat Embroidery Micro-ERP Backend Skill

## Core Business Formulas
1. **SAC 9988 Stitch Invoicing**:
   $$\text{Gross} = \left(\frac{\text{Stitches}}{1000}\right) \times \text{Rate} \times \text{Heads}$$
   - Intra-state Gujarat: 2.5% CGST + 2.5% SGST.
   - Inter-state: 5.0% IGST.

2. **Fabric Shrinkage Reconciliation**:
   $$\text{Shrinkage \%} = \frac{\text{Inward} - \text{Outward}}{\text{Inward}} \times 100$$
   - Flag anomaly if $> 3.0\%$.

3. **Karigar Fortnightly Wage Hisab**:
   $$\text{Net Pay} = \text{Shift Output Stitches} \times \text{Piece Rate} - \text{Uchapat Advances} - \text{Deductions}$$

4. **Munim Multi-Client Access**:
   - Double-handshake validation (`MunimClient` model).
   - Validates `x-company-id` switch header.
