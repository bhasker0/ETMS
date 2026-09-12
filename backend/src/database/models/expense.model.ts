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

export type ExpenseCategory = 'DIRECT' | 'INDIRECT';

@Table({
  tableName: 'expenses',
  timestamps: true,
  paranoid: true,
  underscored: true,
})
export class Expense extends Model<Expense> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @ForeignKey(() => Company)
  @Index('idx_expense_company')
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  company_id: string;

  @Index('idx_expense_category')
  @Column({
    type: DataType.ENUM('DIRECT', 'INDIRECT'),
    allowNull: false,
  })
  category: ExpenseCategory;

  @Index('idx_expense_type')
  @Column({
    type: DataType.STRING(100),
    allowNull: false,
  })
  expense_type: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  payee_name: string;

  @Index('idx_expense_date')
  @Column({
    type: DataType.DATEONLY,
    allowNull: false,
  })
  expense_date: string;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
  })
  amount: number;

  @Default('CASH')
  @Column({
    type: DataType.STRING(50),
    allowNull: false,
  })
  payment_mode: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  reference_no: string;

  @Default(false)
  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
  })
  is_gst_applicable: boolean;

  @Default(0)
  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
  })
  gst_amount: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  description: string;

  @BelongsTo(() => Company)
  company: Company;

  @CreatedAt
  created_at: Date;

  @UpdatedAt
  updated_at: Date;

  @DeletedAt
  deleted_at: Date;
}
