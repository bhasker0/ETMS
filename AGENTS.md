# ETMS Backend Development Guidelines

- **Architecture**: NestJS 10, Sequelize TypeScript ORM, PostgreSQL 16, Redis, Puppeteer Microservice, Winston Logger.
- **Tenant Context**: Enforce `TenantContextMiddleware` and `TenantGuard` on all routes except `@Public()`.
- **SAC 9988 Stitch Billing**: Formula: `(Stitches / 1000) * Rate * Heads`.
- **Karigar Wage Cycles**: 1st-15th and 16th-End. Deduct Uchapat advances and log in ledger.
- **Tally Prime XML**: Strictly adhere to `tally-xml.builder.ts` output matching Tally Prime XML requirements.
