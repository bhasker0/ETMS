# Surat Embroidery Micro-ERP (Multi-Tenant Backend)

Production-Ready Multi-Tenant Micro-ERP Backend tailored for the **Surat Embroidery Job-Work Cluster** (GST SAC 9988 - 5% GST). Built with **Nest.js (TypeScript)**, **Sequelize TypeScript ORM**, **PostgreSQL 16**, **Redis**, **Winston Logger with Daily Rotation**, and **Puppeteer Microservice** for PDF generation.

---

## Architecture Overview

```
                           +------------------------+
                           |  Client / Web / Munim  |
                           +-----------+------------+
                                       |
                                HTTP / REST API (Port 4000)
                                       |
                                       v
                    +--------------------------------------+
                    |      Nest.js Multi-Tenant Backend    |
                    |  - TenantContext / TenantGuard       |
                    |  - RBAC & PermissionsGuard           |
                    |  - SAC 9988 Stitch Billing Engine    |
                    |  - Fabric Shrinkage Reconciliation   |
                    |  - Karigar Fortnightly Wage Hisab    |
                    |  - Tally Prime XML Export            |
                    |  - Audit Log & Winston Rotation      |
                    +----+-------------+--------------+----+
                         |             |              |
                         v             v              v
               +------------+   +------------+  +-----------------+
               | PostgreSQL |   | Redis      |  | Puppeteer Micro |
               | 16 Database|   | Token Cache|  | PDF Generator   |
               | (Port 5432)|   | (Port 6379)|  | (Port 3001)     |
               +------------+   +------------+  +-----------------+
```

---

## Quick Start (Docker Environment)

> [!IMPORTANT]
> All services run exclusively in Docker containers. No local Node.js or PostgreSQL installation is needed on the host.

### 1. Build and Start Containers
```bash
docker compose up --build -d
```

Check running container status:
```bash
docker compose ps
```

### 2. Populate Database with Surat Sample Data
```bash
docker compose exec backend npm run seed
```

### 3. Run Automated Test Suite
```bash
docker compose run --rm backend npm test
```

### 4. Interactive API Documentation (Swagger)
Open in browser:
```
http://localhost:4000/api/docs
```

---

## Seed Data & Credentials

| Role | Name / Company | Mobile | Password | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | System Super Admin | `9999999999` | `Password@123` | Master platform admin |
| **Company Owner** | Bhavesh Patel (Radhe Krishna Embroidery) | `9825012345` | `Password@123` | 32/44/66 Head Machines, Surat GIDC |
| **Supervisor** | Sanjay Mehta | `9825099001` | `Password@123` | Shift logging & Challans |
| **Company Owner 2** | Ghanshyam Shah (Shree Ram Textiles) | `9825054321` | `Password@123` | Ring Road Textile Market |
| **Munim (Accountant)** | Kantibhai Munim | `9825099999` | `Password@123` | Approved access to Radhe Krishna |

---

## Core Business & Calculation Engines

### 1. SAC 9988 Stitch Billing Engine
$$\text{Gross Amount} = \left(\frac{\text{Total Stitches}}{1000}\right) \times \text{Rate per 1000} \times \text{Machine Heads}$$
- **Intra-State (Gujarat):** 2.5% CGST + 2.5% SGST = 5.0% GST
- **Inter-State:** 5.0% IGST
- **Net Amount** = $\text{Gross Amount} + \text{GST 5\%}$

### 2. Fabric Shrinkage Reconciliation Engine
$$\text{Shrinkage \%} = \frac{\text{Inward Fabric Meters} - \text{Outward Finished Meters}}{\text{Inward Fabric Meters}} \times 100$$
- Automated warning flagged if shrinkage exceeds Surat fabric tolerance threshold (**> 3.0%**).

### 3. Karigar Fortnightly Wage Hisab (1st-15th & 16th-End of Month)
$$\text{Net Pay} = (\text{Total Shift Piece-Rate Output}) - (\text{Total Uchapat Advances}) - (\text{Thread/Other Deductions})$$

### 4. Munim <-> Company Double-Handshake Collaboration
- Double-handshake request system (`MunimClient` model with status `PENDING`, `ACCEPTED`, `REJECTED`, `REVOKED`).
- Multi-client company context switching with `x-company-id` header validation.
- Consolidated Daybook and bulk Tally XML generation across all client companies.

### 5. Tally Prime XML Export
Compliant with Tally Prime 3.0/4.0 XML `<ENVELOPE><BODY><IMPORTDATA><TALLYMESSAGE>` standard format for instant import of Sales Vouchers, Ledger allocations, CGST/SGST/IGST breakdown, and SAC 9988 narrations.

---

## Winston Logging & Audit Trail
- Structured JSON logging with daily log rotation under `backend/logs/combined-YYYY-MM-DD.log` and `error-YYYY-MM-DD.log`.
- `LoggingInterceptor`: logs `method`, `url`, `statusCode`, `executionTimeMs`, `company_id`, `user_id`, `ip`, `x-correlation-id`.
- `AuditLog`: records changes and snapshot differentials for financial models (`InwardChallan`, `OutwardInvoice`, `KarigarUchapat`).
