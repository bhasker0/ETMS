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
import { Karigar } from './karigar.model';
import { User } from './user.model';
import { PaymentMode } from '../../common/enums/payment-mode.enum';

@Table({
  tableName: 'karigar_uchapats',
  timestamps: true,
  paranoid: true,
  underscored: true,
})
export class KarigarUchapat extends Model<KarigarUchapat> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @ForeignKey(() => Company)
  @Index('idx_uchapat_company')
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  company_id: string;

  @ForeignKey(() => Karigar)
  @Index('idx_uchapat_karigar')
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  karigar_id: string;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
  })
  amount: number;

  @Column({
    type: DataType.DATEONLY,
    allowNull: false,
  })
  date: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  reason: string;

  @Column({
    type: DataType.ENUM(...Object.values(PaymentMode)),
    allowNull: false,
    defaultValue: PaymentMode.CASH,
  })
  payment_mode: PaymentMode;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  approved_by: string;

  @Default(false)
  @Column(DataType.BOOLEAN)
  is_settled: boolean;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  settlement_hisab_id: string;

  @BelongsTo(() => Company, 'company_id')
  company: Company;

  @BelongsTo(() => Karigar, 'karigar_id')
  karigar: Karigar;

  @BelongsTo(() => User, 'approved_by')
  approver: User;

  @CreatedAt
  created_at: Date;

  @UpdatedAt
  updated_at: Date;

  @DeletedAt
  deleted_at: Date;
}
