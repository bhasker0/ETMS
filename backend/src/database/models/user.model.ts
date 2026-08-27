import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  Unique,
  HasMany,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
} from 'sequelize-typescript';
import { UserCompanyRole } from './user-company-role.model';
import { MunimClient } from './munim-client.model';

@Table({
  tableName: 'users',
  timestamps: true,
  paranoid: true,
  underscored: true,
})
export class User extends Model<User> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  full_name: string;

  @Unique
  @Column({
    type: DataType.STRING(15),
    allowNull: false,
  })
  mobile: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  email: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  password_hash: string;

  @Default('ACTIVE')
  @Column(DataType.STRING(20))
  status: string;

  @Default(false)
  @Column(DataType.BOOLEAN)
  is_internal_ops: boolean;

  @HasMany(() => UserCompanyRole, 'user_id')
  userCompanyRoles: UserCompanyRole[];

  @HasMany(() => MunimClient, 'munim_user_id')
  munimClients: MunimClient[];

  @CreatedAt
  created_at: Date;

  @UpdatedAt
  updated_at: Date;

  @DeletedAt
  deleted_at: Date;
}
