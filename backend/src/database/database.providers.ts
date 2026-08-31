import { Sequelize } from 'sequelize-typescript';
import { SEQUELIZE_TOKEN } from '../common/constants';
import { User } from './models/user.model';
import { Company } from './models/company.model';
import { UserCompanyRole } from './models/user-company-role.model';
import { MunimClient } from './models/munim-client.model';
import { Machine } from './models/machine.model';
import { Karigar } from './models/karigar.model';
import { KarigarUchapat } from './models/karigar-uchapat.model';
import { InwardChallan } from './models/inward-challan.model';
import { DailyShiftLog } from './models/daily-shift-log.model';
import { OutwardInvoice } from './models/outward-invoice.model';
import { AuditLog } from './models/audit-log.model';
import { Party } from './models/party.model';

export const databaseProviders = [
  {
    provide: SEQUELIZE_TOKEN,
    useFactory: async () => {
      const sequelize = new Sequelize({
        dialect: 'postgres',
        host: process.env.DB_HOST || 'postgres',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_DATABASE || 'surat_embroidery_erp',
        logging: process.env.NODE_ENV === 'development' ? (sql) => console.log(`[SQL] ${sql}`) : false,
        pool: {
          max: 20,
          min: 2,
          acquire: 30000,
          idle: 10000,
        },
      });

      sequelize.addModels([
        User,
        Company,
        UserCompanyRole,
        MunimClient,
        Machine,
        Karigar,
        KarigarUchapat,
        InwardChallan,
        DailyShiftLog,
        OutwardInvoice,
        AuditLog,
        Party,
      ]);

      await sequelize.authenticate();
      console.log('PostgreSQL Connection has been established successfully.');

      // Sync schema automatically
      await sequelize.sync({ alter: true });
      console.log('Sequelize Models synchronized successfully.');

      return sequelize;
    },
  },
];
