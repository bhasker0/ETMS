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

@Table({
  tableName: 'parties',
  timestamps: true,
  paranoid: true,
  underscored: true,
})
export class Party extends Model<Party> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @ForeignKey(() => Company)
  @Index('idx_party_company')
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  company_id: string;

  @Index('idx_party_name_company')
  @Column({
    type: DataType.STRING(150),
    allowNull: false,
  })
  name: string;

  @Column({
    type: DataType.STRING(15),
    allowNull: true,
  })
  gstin: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: true,
  })
  mobile: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  email: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  address: string;

  @Default('Surat')
  @Column({
    type: DataType.STRING(50),
    allowNull: false,
  })
  city: string;

  @Default('24')
  @Column({
    type: DataType.STRING(2),
    allowNull: false,
  })
  state_code: string;

  @Default(15)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  credit_period_days: number;

  @Default(0)
  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
  })
  opening_balance: number;

  @Default(true)
  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
  })
  is_active: boolean;

  @BelongsTo(() => Company)
  company: Company;

  @CreatedAt
  created_at: Date;

  @UpdatedAt
  updated_at: Date;

  @DeletedAt
  deleted_at: Date;
}
