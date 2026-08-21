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
import { User } from './user.model';
import { Company } from './company.model';
import { MunimRequestStatus, MunimInitiatorType } from '../../common/enums/munim-request-status.enum';
import { Permission } from '../../common/enums/permission.enum';

@Table({
  tableName: 'munim_clients',
  timestamps: true,
  paranoid: true,
  underscored: true,
})
export class MunimClient extends Model<MunimClient> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @ForeignKey(() => User)
  @Index('idx_munim_company')
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  munim_user_id: string;

  @ForeignKey(() => Company)
  @Index('idx_munim_company')
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  company_id: string;

  @Column({
    type: DataType.ENUM(...Object.values(MunimInitiatorType)),
    allowNull: false,
  })
  initiator_type: MunimInitiatorType;

  @Column({
    type: DataType.ENUM(...Object.values(MunimRequestStatus)),
    allowNull: false,
    defaultValue: MunimRequestStatus.PENDING,
  })
  status: MunimRequestStatus;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  requested_by_user_id: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  responded_by_user_id: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  request_notes: string;

  @Default([
    Permission.DAYBOOK_VIEW,
    Permission.TALLY_EXPORT,
    Permission.INVOICE_READ,
    Permission.CHALLAN_READ,
    Permission.SHIFT_LOG_READ,
    Permission.UCHAPAT_READ,
    Permission.HISAB_GENERATE,
  ])
  @Column(DataType.JSONB)
  permissions: Permission[];

  @BelongsTo(() => User, 'munim_user_id')
  munimUser: User;

  @BelongsTo(() => Company, 'company_id')
  company: Company;

  @BelongsTo(() => User, 'requested_by_user_id')
  requester: User;

  @BelongsTo(() => User, 'responded_by_user_id')
  responder: User;

  @CreatedAt
  created_at: Date;

  @UpdatedAt
  updated_at: Date;

  @DeletedAt
  deleted_at: Date;
}
