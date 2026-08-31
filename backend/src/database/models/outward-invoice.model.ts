import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  ForeignKey,
  BelongsTo,
  Index,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
} from 'sequelize-typescript';
import { Company } from './company.model';
import { InwardChallan } from './inward-challan.model';
import { SAC_CODE_EMBROIDERY, DEFAULT_GST_RATE } from '../../common/constants';

@Table({
  tableName: 'outward_invoices',
  timestamps: true,
  paranoid: true,
  underscored: true,
})
export class OutwardInvoice extends Model<OutwardInvoice> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @ForeignKey(() => Company)
  @Index('idx_invoice_company')
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  company_id: string;

  @ForeignKey(() => InwardChallan)
  @Index('idx_invoice_challan')
  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  inward_challan_id: string;

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  lot_items: Array<{
    inward_challan_id: string;
    lot_no: string;
    meters: number;
    thans?: number;
    fabric_quality?: string;
    design_no?: string;
    rate?: number;
  }>;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
  })
  invoice_no: string;

  @Column({
    type: DataType.DATEONLY,
    allowNull: false,
  })
  invoice_date: string;

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

  @Default(SAC_CODE_EMBROIDERY)
  @Column(DataType.STRING(10))
  sac_code: string;

  @Default(32)
  @Column(DataType.INTEGER)
  machine_heads: number;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  total_stitches: number;

  @Column({
    type: DataType.DECIMAL(10, 4),
    allowNull: false,
  })
  rate_per_1000: number;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
  })
  gross_amount: number;

  @Default(DEFAULT_GST_RATE)
  @Column(DataType.DECIMAL(5, 4))
  gst_rate: number;

  @Default(0)
  @Column(DataType.DECIMAL(12, 2))
  cgst_amount: number;

  @Default(0)
  @Column(DataType.DECIMAL(12, 2))
  sgst_amount: number;

  @Default(0)
  @Column(DataType.DECIMAL(12, 2))
  igst_amount: number;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
  })
  gst_5_percent: number;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
  })
  net_amount: number;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
  })
  inward_meters: number;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
  })
  outward_meters: number;

  @Column({
    type: DataType.DECIMAL(6, 2),
    allowNull: false,
  })
  shrinkage_percent: number;

  @Default(false)
  @Column(DataType.BOOLEAN)
  is_shrinkage_exceeded: boolean;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  shrinkage_warning: string;

  @Column({
    type: DataType.STRING(500),
    allowNull: true,
  })
  pdf_url: string;

  @Default(false)
  @Column(DataType.BOOLEAN)
  tally_synced: boolean;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  tally_guid: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  tally_sync_time: Date;

  @BelongsTo(() => Company, 'company_id')
  company: Company;

  @BelongsTo(() => InwardChallan, 'inward_challan_id')
  inwardChallan: InwardChallan;

  @CreatedAt
  created_at: Date;

  @UpdatedAt
  updated_at: Date;

  @DeletedAt
  deleted_at: Date;
}
