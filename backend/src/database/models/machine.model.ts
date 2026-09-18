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
import { DailyShiftLog } from './daily-shift-log.model';

@Table({
  tableName: 'machines',
  timestamps: true,
  paranoid: true,
  underscored: true,
})
export class Machine extends Model<Machine> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @ForeignKey(() => Company)
  @Index('idx_machine_company')
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  company_id: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
  })
  machine_no: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    validate: {
      isIn: [[24, 32, 44, 66]],
    },
  })
  head_count: number;

  @Default(850)
  @Column(DataType.INTEGER)
  rpm: number;

  @Default('Surat Multi-Head Embroidery')
  @Column(DataType.STRING(100))
  make_model: string;

  @Default(true)
  @Column(DataType.BOOLEAN)
  is_active: boolean;

  @Default(DataType.UUIDV4)
  @Index('idx_machine_api_key')
  @Column({
    type: DataType.STRING(100),
    allowNull: false,
  })
  api_key: string;

  @Default('stopped')
  @Column({
    type: DataType.STRING(50),
    allowNull: false,
  })
  status: string;

  @Default(0)
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  stitch_count: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  last_telemetry_at: Date;

  @BelongsTo(() => Company, 'company_id')
  company: Company;

  @HasMany(() => DailyShiftLog, 'machine_id')
  shiftLogs: DailyShiftLog[];

  @CreatedAt
  created_at: Date;

  @UpdatedAt
  updated_at: Date;

  @DeletedAt
  deleted_at: Date;
}
