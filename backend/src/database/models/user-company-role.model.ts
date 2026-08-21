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
import { Role } from '../../common/enums/role.enum';
import { Permission } from '../../common/enums/permission.enum';

@Table({
  tableName: 'user_company_roles',
  timestamps: true,
  paranoid: true,
  underscored: true,
})
export class UserCompanyRole extends Model<UserCompanyRole> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @ForeignKey(() => User)
  @Index('idx_user_company')
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  user_id: string;

  @ForeignKey(() => Company)
  @Index('idx_user_company')
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  company_id: string;

  @Column({
    type: DataType.ENUM(...Object.values(Role)),
    allowNull: false,
    defaultValue: Role.COMPANY_ADMIN,
  })
  role: Role;

  @Default([])
  @Column(DataType.JSONB)
  permissions: Permission[];

  @Default(true)
  @Column(DataType.BOOLEAN)
  is_active: boolean;

  @BelongsTo(() => User, 'user_id')
  user: User;

  @BelongsTo(() => Company, 'company_id')
  company: Company;

  @CreatedAt
  created_at: Date;

  @UpdatedAt
  updated_at: Date;

  @DeletedAt
  deleted_at: Date;
}
