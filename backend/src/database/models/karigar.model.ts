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
import { WageType } from '../../common/enums/wage-type.enum';
import { DailyShiftLog } from './daily-shift-log.model';
import { KarigarUchapat } from './karigar-uchapat.model';

@Table({
  tableName: 'karigars',
  timestamps: true,
  paranoid: true,
  underscored: true,
})
export class Karigar extends Model<Karigar> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @ForeignKey(() => Company)
  @Index('idx_karigar_company')
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  company_id: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
  })
  name: string;

  @Column({
    type: DataType.STRING(15),
    allowNull: true,
  })
  mobile: string;

  @Column({
    type: DataType.ENUM(...Object.values(WageType)),
    allowNull: false,
    defaultValue: WageType.PIECE_RATE,
  })
  wage_type: WageType;

  @Default(1.2)
  @Column(DataType.DECIMAL(10, 2))
  default_rate_per_meter: number;

  @Default(0)
  @Column(DataType.DECIMAL(10, 2))
  default_monthly_salary: number;

  @Default(0)
  @Column(DataType.DECIMAL(12, 2))
  incentive_threshold_value: number;

  @Default('STITCHES')
  @Column(DataType.STRING(20))
  incentive_threshold_type: string;

  @Default(0)
  @Column(DataType.DECIMAL(10, 2))
  incentive_rate: number;

  @Default('PER_1K_STITCHES')
  @Column(DataType.STRING(20))
  incentive_rate_type: string;

  @Default(true)
  @Column(DataType.BOOLEAN)
  is_active: boolean;

  @BelongsTo(() => Company, 'company_id')
  company: Company;

  @HasMany(() => DailyShiftLog, 'karigar_id')
  shiftLogs: DailyShiftLog[];

  @HasMany(() => KarigarUchapat, 'karigar_id')
  uchapatAdvances: KarigarUchapat[];

  @CreatedAt
  created_at: Date;

  @UpdatedAt
  updated_at: Date;

  @DeletedAt
  deleted_at: Date;
}
