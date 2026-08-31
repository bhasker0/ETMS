import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  ForeignKey,
  BelongsTo,
  HasMany,
  Index,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
} from 'sequelize-typescript';
import { Company } from './company.model';
import { ChallanStatus } from '../../common/enums/challan-status.enum';
import { DailyShiftLog } from './daily-shift-log.model';
import { OutwardInvoice } from './outward-invoice.model';

@Table({
  tableName: 'inward_challans',
  timestamps: true,
  paranoid: true,
  underscored: true,
})
export class InwardChallan extends Model<InwardChallan> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @ForeignKey(() => Company)
  @Index('idx_inward_company')
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  company_id: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
  })
  challan_no: string;

  @Column({
    type: DataType.DATEONLY,
    allowNull: false,
  })
  challan_date: string;

  @Column({
    type: DataType.STRING(150),
    allowNull: false,
  })
  trader_name: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: true,
  })
  trader_gstin: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
  })
  lot_no: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  than_count: number;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
  })
  inward_meters: number;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
  })
  fabric_quality: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
  })
  design_no: string;

  @Default(0)
  @Column(DataType.INTEGER)
  stitch_count: number;

  @Default(0)
  @Column(DataType.DECIMAL(10, 2))
  karigar_commission_rate: number;

  @Default('PER_1K_STITCHES')
  @Column(DataType.STRING(20))
  karigar_commission_type: string;

  @Default(0)
  @Column(DataType.DECIMAL(10, 2))
  jobwork_price_per_1k: number;

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  items: Array<{
    design_no: string;
    stitch_count: number;
    commission_type: string;
    commission_rate: number;
    jobwork_price_per_1k: number;
    meters: number;
    than_count: number;
  }>;

  @Column({
    type: DataType.ENUM(...Object.values(ChallanStatus)),
    allowNull: false,
    defaultValue: ChallanStatus.RECEIVED,
  })
  status: ChallanStatus;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  notes: string;

  @BelongsTo(() => Company, 'company_id')
  company: Company;

  @HasMany(() => DailyShiftLog, 'inward_challan_id')
  shiftLogs: DailyShiftLog[];

  @HasMany(() => OutwardInvoice, 'inward_challan_id')
  outwardInvoices: OutwardInvoice[];

  @CreatedAt
  created_at: Date;

  @UpdatedAt
  updated_at: Date;

  @DeletedAt
  deleted_at: Date;
}
