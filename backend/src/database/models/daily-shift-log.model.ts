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
import { Machine } from './machine.model';
import { InwardChallan } from './inward-challan.model';
import { Karigar } from './karigar.model';
import { ShiftType } from '../../common/enums/shift-type.enum';

@Table({
  tableName: 'daily_shift_logs',
  timestamps: true,
  paranoid: true,
  underscored: true,
})
export class DailyShiftLog extends Model<DailyShiftLog> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @ForeignKey(() => Company)
  @Index('idx_shift_company')
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  company_id: string;

  @ForeignKey(() => Machine)
  @Index('idx_shift_machine')
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  machine_id: string;

  @ForeignKey(() => InwardChallan)
  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  inward_challan_id: string;

  @Column({
    type: DataType.ENUM(...Object.values(ShiftType)),
    allowNull: false,
    defaultValue: ShiftType.DAY,
  })
  shift_type: ShiftType;

  @Column({
    type: DataType.DATEONLY,
    allowNull: false,
  })
  shift_date: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
  })
  design_no: string;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  start_counter: number;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  end_counter: number;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  total_stitches: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
  })
  total_meters: number;

  @ForeignKey(() => Karigar)
  @Index('idx_shift_karigar')
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  karigar_id: string;

  @Default(0)
  @Column(DataType.INTEGER)
  downtime_minutes: number;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  downtime_reason: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  operator_notes: string;

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  lot_allocations: Array<{
    inward_challan_id: string;
    lot_no: string;
    design_no: string;
    meters: number;
    stitch_count?: number;
    commission_rate?: number;
    commission_type?: string;
  }>;

  @BelongsTo(() => Company, 'company_id')
  company: Company;

  @BelongsTo(() => Machine, 'machine_id')
  machine: Machine;

  @BelongsTo(() => InwardChallan, 'inward_challan_id')
  inwardChallan: InwardChallan;

  @BelongsTo(() => Karigar, 'karigar_id')
  karigar: Karigar;

  @CreatedAt
  created_at: Date;

  @UpdatedAt
  updated_at: Date;

  @DeletedAt
  deleted_at: Date;
}
