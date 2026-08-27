import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  HasMany,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
} from 'sequelize-typescript';
import { UserCompanyRole } from './user-company-role.model';
import { Machine } from './machine.model';
import { Karigar } from './karigar.model';
import { InwardChallan } from './inward-challan.model';
import { DailyShiftLog } from './daily-shift-log.model';
import { OutwardInvoice } from './outward-invoice.model';
import { KarigarUchapat } from './karigar-uchapat.model';
import { MunimClient } from './munim-client.model';

@Table({
  tableName: 'companies',
  timestamps: true,
  paranoid: true,
  underscored: true,
})
export class Company extends Model<Company> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  name: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
  })
  gstin: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  address: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: true,
  })
  phone: string;

  @Default('ACTIVE')
  @Column(DataType.STRING(20))
  status: string;

  @Default(12)
  @Column(DataType.INTEGER)
  default_shift_hours: number;

  @Default(0)
  @Column(DataType.INTEGER)
  machine_count: number;

  @Default({
    shrinkage_tolerance_percent: 3.0,
    sac_code: '9988',
    default_rate_per_1000: 0.35,
    default_heads: 32,
    bank_details: {
      account_name: '',
      account_number: '',
      ifsc_code: '',
      bank_name: '',
      branch: 'Surat',
    },
  })
  @Column(DataType.JSONB)
  settings: Record<string, any>;

  @HasMany(() => UserCompanyRole, 'company_id')
  userCompanyRoles: UserCompanyRole[];

  @HasMany(() => Machine, 'company_id')
  machines: Machine[];

  @HasMany(() => Karigar, 'company_id')
  karigars: Karigar[];

  @HasMany(() => InwardChallan, 'company_id')
  inwardChallans: InwardChallan[];

  @HasMany(() => DailyShiftLog, 'company_id')
  shiftLogs: DailyShiftLog[];

  @HasMany(() => OutwardInvoice, 'company_id')
  outwardInvoices: OutwardInvoice[];

  @HasMany(() => KarigarUchapat, 'company_id')
  uchapatAdvances: KarigarUchapat[];

  @HasMany(() => MunimClient, 'company_id')
  munimClients: MunimClient[];

  @CreatedAt
  created_at: Date;

  @UpdatedAt
  updated_at: Date;

  @DeletedAt
  deleted_at: Date;
}
