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

export interface PurchaseInvoiceItem {
  description: string;
  category?: string;
  hsn?: string;
  qty: number;
  unit: string;
  rate: number;
  taxable_amount: number;
  gst_rate?: number;
  gst_amount?: number;
  total: number;
}

@Table({
  tableName: 'purchase_invoices',
  timestamps: true,
  paranoid: true,
  underscored: true,
})
export class PurchaseInvoice extends Model<PurchaseInvoice> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @ForeignKey(() => Company)
  @Index('idx_purchase_invoice_company')
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  company_id: string;

  @Index('idx_purchase_invoice_supplier')
  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  supplier_name: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: true,
  })
  supplier_gstin: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: true,
  })
  supplier_phone: string;

  @Index('idx_purchase_invoice_no')
  @Column({
    type: DataType.STRING(100),
    allowNull: false,
  })
  invoice_no: string;

  @Index('idx_purchase_invoice_date')
  @Column({
    type: DataType.DATEONLY,
    allowNull: false,
  })
  invoice_date: string;

  @Default('RAW_MATERIAL')
  @Column({
    type: DataType.STRING(50),
    allowNull: false,
  })
  category: string;

  @Default('PENDING')
  @Column({
    type: DataType.STRING(50),
    allowNull: false,
  })
  payment_status: string;

  @Default('BANK_TRANSFER')
  @Column({
    type: DataType.STRING(50),
    allowNull: true,
  })
  payment_mode: string;

  @Default([])
  @Column({
    type: DataType.JSONB,
    allowNull: false,
  })
  items: PurchaseInvoiceItem[];

  @Default(0)
  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
  })
  subtotal: number;

  @Default(0)
  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
  })
  gst_amount: number;

  @Default(0)
  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
  })
  net_amount: number;

  @Default(0)
  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
  })
  paid_amount: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  notes: string;

  @BelongsTo(() => Company)
  company: Company;

  @CreatedAt
  created_at: Date;

  @UpdatedAt
  updated_at: Date;

  @DeletedAt
  deleted_at: Date;
}
