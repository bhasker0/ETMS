import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  CreatedAt,
  Index,
} from 'sequelize-typescript';

@Table({
  tableName: 'audit_logs',
  timestamps: true,
  updatedAt: false,
  underscored: true,
})
export class AuditLog extends Model<AuditLog> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Index('idx_audit_company')
  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  company_id: string;

  @Index('idx_audit_user')
  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  user_id: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
  })
  entity_type: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
  })
  entity_id: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
  })
  action: string;

  @Column(DataType.JSONB)
  old_values: Record<string, any>;

  @Column(DataType.JSONB)
  new_values: Record<string, any>;

  @Column({
    type: DataType.STRING(45),
    allowNull: true,
  })
  ip_address: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  correlation_id: string;

  @CreatedAt
  created_at: Date;
}
