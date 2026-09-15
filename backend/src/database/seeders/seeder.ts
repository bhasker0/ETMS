import { Sequelize } from 'sequelize-typescript';
import * as bcrypt from 'bcryptjs';
import { User } from '../models/user.model';
import { Company } from '../models/company.model';
import { UserCompanyRole } from '../models/user-company-role.model';
import { MunimClient } from '../models/munim-client.model';
import { Machine } from '../models/machine.model';
import { Karigar } from '../models/karigar.model';
import { KarigarUchapat } from '../models/karigar-uchapat.model';
import { InwardChallan } from '../models/inward-challan.model';
import { DailyShiftLog } from '../models/daily-shift-log.model';
import { OutwardInvoice } from '../models/outward-invoice.model';
import { AuditLog } from '../models/audit-log.model';
import { Role } from '../../common/enums/role.enum';
import { Permission } from '../../common/enums/permission.enum';
import { WageType } from '../../common/enums/wage-type.enum';
import { ShiftType } from '../../common/enums/shift-type.enum';
import { ChallanStatus } from '../../common/enums/challan-status.enum';
import { MunimRequestStatus, MunimInitiatorType } from '../../common/enums/munim-request-status.enum';
import { PaymentMode } from '../../common/enums/payment-mode.enum';

async function runSeed() {
  console.log('--- Starting Surat Embroidery ERP Database Seeder ---');

  const sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'surat_embroidery_erp',
    logging: false,
  });

  sequelize.addModels([
    User,
    Company,
    UserCompanyRole,
    MunimClient,
    Machine,
    Karigar,
    KarigarUchapat,
    InwardChallan,
    DailyShiftLog,
    OutwardInvoice,
    AuditLog,
  ]);

  await sequelize.authenticate();
  await sequelize.sync({ alter: true });

  const salt = await bcrypt.genSalt(10);
  const defaultPasswordHash = await bcrypt.hash('Password@123', salt);

  // 1. Super Admin
  const [superAdmin] = await User.findOrCreate({
    where: { mobile: '9999999999' },
    defaults: {
      full_name: 'System Super Admin',
      mobile: '9999999999',
      email: 'admin@suraterp.com',
      password_hash: defaultPasswordHash,
      status: 'ACTIVE',
    } as any,
  });

  // 2. Company 1: Radhe Krishna Embroidery Works
  const [owner1] = await User.findOrCreate({
    where: { mobile: '9825012345' },
    defaults: {
      full_name: 'Bhavesh Patel (Owner)',
      mobile: '9825012345',
      email: 'bhavesh@radhekrishnaemb.com',
      password_hash: defaultPasswordHash,
      status: 'ACTIVE',
    } as any,
  });

  const [company1] = await Company.findOrCreate({
    where: { gstin: '24AAAAA1111A1Z5' },
    defaults: {
      name: 'Radhe Krishna Embroidery Works',
      gstin: '24AAAAA1111A1Z5',
      address: 'Plot 101-102, Khatodara GIDC, Surat, Gujarat - 395002',
      phone: '9825012345',
      default_shift_hours: 12,
      machine_count: 3,
      settings: {
        shrinkage_tolerance_percent: 3.0,
        sac_code: '9988',
        default_rate_per_1000: 0.35,
        default_heads: 32,
      },
    } as any,
  });

  // Assign Owner Role with all permissions
  const allPermissions = Object.values(Permission);
  await UserCompanyRole.findOrCreate({
    where: { user_id: owner1.id, company_id: company1.id },
    defaults: {
      user_id: owner1.id,
      company_id: company1.id,
      role: Role.COMPANY_ADMIN,
      permissions: allPermissions,
      is_active: true,
    } as any,
  });

  // Supervisor for Company 1
  const [supervisor1] = await User.findOrCreate({
    where: { mobile: '9825099001' },
    defaults: {
      full_name: 'Sanjay Mehta (Supervisor)',
      mobile: '9825099001',
      email: 'sanjay@radhekrishnaemb.com',
      password_hash: defaultPasswordHash,
      status: 'ACTIVE',
    } as any,
  });

  await UserCompanyRole.findOrCreate({
    where: { user_id: supervisor1.id, company_id: company1.id },
    defaults: {
      user_id: supervisor1.id,
      company_id: company1.id,
      role: Role.SUPERVISOR,
      permissions: [
        Permission.SHIFT_LOG,
        Permission.SHIFT_LOG_READ,
        Permission.CHALLAN_CREATE,
        Permission.CHALLAN_READ,
        Permission.CHALLAN_UPDATE,
        Permission.UCHAPAT_MANAGE,
        Permission.UCHAPAT_READ,
      ],
      is_active: true,
    } as any,
  });

  // Machines for Company 1
  const [m1] = await Machine.findOrCreate({
    where: { company_id: company1.id, machine_no: 'M-01' },
    defaults: {
      company_id: company1.id,
      machine_no: 'M-01',
      head_count: 32,
      rpm: 850,
      make_model: 'Sanjay Multi-Head High Speed',
      is_active: true,
    } as any,
  });

  const [m2] = await Machine.findOrCreate({
    where: { company_id: company1.id, machine_no: 'M-02' },
    defaults: {
      company_id: company1.id,
      machine_no: 'M-02',
      head_count: 44,
      rpm: 850,
      make_model: 'Maya Multi-Head Embroidery',
      is_active: true,
    } as any,
  });

  const [m3] = await Machine.findOrCreate({
    where: { company_id: company1.id, machine_no: 'M-03' },
    defaults: {
      company_id: company1.id,
      machine_no: 'M-03',
      head_count: 66,
      rpm: 900,
      make_model: 'Tajima Japan Heavy Duty',
      is_active: true,
    } as any,
  });

  // Karigars for Company 1
  const [k1] = await Karigar.findOrCreate({
    where: { company_id: company1.id, name: 'Rameshwar Bhai (Master Karigar)' },
    defaults: {
      company_id: company1.id,
      name: 'Rameshwar Bhai (Master Karigar)',
      mobile: '9876500001',
      wage_type: WageType.PIECE_RATE,
      default_rate_per_meter: 1.25,
      is_active: true,
    } as any,
  });

  const [k2] = await Karigar.findOrCreate({
    where: { company_id: company1.id, name: 'Dinesh Yadav' },
    defaults: {
      company_id: company1.id,
      name: 'Dinesh Yadav',
      mobile: '9876500002',
      wage_type: WageType.PIECE_RATE,
      default_rate_per_meter: 1.3,
      is_active: true,
    } as any,
  });

  const [k3] = await Karigar.findOrCreate({
    where: { company_id: company1.id, name: 'Mukesh Sharma' },
    defaults: {
      company_id: company1.id,
      name: 'Mukesh Sharma',
      mobile: '9876500003',
      wage_type: WageType.FIXED_MONTHLY,
      default_monthly_salary: 18000,
      is_active: true,
    } as any,
  });

  // Inward Challans
  const [c1] = await InwardChallan.findOrCreate({
    where: { company_id: company1.id, challan_no: 'CH-2026-0001' },
    defaults: {
      company_id: company1.id,
      challan_no: 'CH-2026-0001',
      challan_date: '2026-08-01',
      trader_name: 'Vandana Silk Mills Pvt Ltd',
      trader_gstin: '24AABCV1234F1Z8',
      lot_no: 'LOT-8891',
      than_count: 10,
      inward_meters: 1000.0,
      fabric_quality: 'Georgette 60g',
      design_no: 'DS-4029',
      status: ChallanStatus.DISPATCHED,
      notes: 'Urgent lot delivery required',
    } as any,
  });

  const [c2] = await InwardChallan.findOrCreate({
    where: { company_id: company1.id, challan_no: 'CH-2026-0002' },
    defaults: {
      company_id: company1.id,
      challan_no: 'CH-2026-0002',
      challan_date: '2026-08-05',
      trader_name: 'Surat Textile Hub',
      trader_gstin: '24BBBCV5678F1Z2',
      lot_no: 'LOT-8892',
      than_count: 8,
      inward_meters: 800.0,
      fabric_quality: 'Heavy Organza',
      design_no: 'DS-7011',
      status: ChallanStatus.IN_PROGRESS,
    } as any,
  });

  // Daily Shift Logs for Karigar 1 (Rameshwar Bhai)
  await DailyShiftLog.findOrCreate({
    where: {
      company_id: company1.id,
      machine_id: m1.id,
      shift_date: '2026-08-02',
      shift_type: ShiftType.DAY,
    },
    defaults: {
      company_id: company1.id,
      machine_id: m1.id,
      inward_challan_id: c1.id,
      shift_type: ShiftType.DAY,
      shift_date: '2026-08-02',
      design_no: 'DS-4029',
      start_counter: 100000,
      end_counter: 320000,
      total_stitches: 220000,
      total_meters: 110.0,
      karigar_id: k1.id,
      downtime_minutes: 20,
      downtime_reason: 'Thread breakage',
    } as any,
  });

  await DailyShiftLog.findOrCreate({
    where: {
      company_id: company1.id,
      machine_id: m1.id,
      shift_date: '2026-08-03',
      shift_type: ShiftType.DAY,
    },
    defaults: {
      company_id: company1.id,
      machine_id: m1.id,
      inward_challan_id: c1.id,
      shift_type: ShiftType.DAY,
      shift_date: '2026-08-03',
      design_no: 'DS-4029',
      start_counter: 320000,
      end_counter: 550000,
      total_stitches: 230000,
      total_meters: 115.0,
      karigar_id: k1.id,
      downtime_minutes: 10,
      downtime_reason: 'Bobbin thread change',
    } as any,
  });

  // Uchapat (Cash/UPI Advances)
  await KarigarUchapat.findOrCreate({
    where: {
      company_id: company1.id,
      karigar_id: k1.id,
      date: '2026-08-05',
    },
    defaults: {
      company_id: company1.id,
      karigar_id: k1.id,
      amount: 2000.0,
      date: '2026-08-05',
      reason: 'Raksha Bandhan advance',
      payment_mode: PaymentMode.CASH,
      approved_by: owner1.id,
      is_settled: false,
    } as any,
  });

  // Outward Invoice with SAC 9988 formula & Shrinkage computation
  // Total Stitches: 450,000 | Rate: 0.35 | Heads: 32
  // Gross = (450000 / 1000) * 0.35 * 32 = 5040.00
  // CGST = 126.00, SGST = 126.00, GST = 252.00, Net = 5292.00
  // Inward: 1000m, Outward: 965m => Shrinkage: 3.50% (>3% Warning!)
  await OutwardInvoice.findOrCreate({
    where: {
      company_id: company1.id,
      invoice_no: 'INV-2026-0001',
    },
    defaults: {
      company_id: company1.id,
      inward_challan_id: c1.id,
      invoice_no: 'INV-2026-0001',
      invoice_date: '2026-08-06',
      trader_name: 'Vandana Silk Mills Pvt Ltd',
      trader_gstin: '24AABCV1234F1Z8',
      sac_code: '9988',
      machine_heads: 32,
      total_stitches: 450000,
      rate_per_1000: 0.35,
      gross_amount: 5040.0,
      gst_rate: 0.05,
      cgst_amount: 126.0,
      sgst_amount: 126.0,
      igst_amount: 0.0,
      gst_5_percent: 252.0,
      net_amount: 5292.0,
      inward_meters: 1000.0,
      outward_meters: 965.0,
      shrinkage_percent: 3.5,
      is_shrinkage_exceeded: true,
      shrinkage_warning: 'Shrinkage 3.50% exceeds acceptable Surat fabric tolerance (3.00%)',
      tally_synced: false,
    } as any,
  });

  // 3. Company 2: Shree Ram Textiles
  const [owner2] = await User.findOrCreate({
    where: { mobile: '9825054321' },
    defaults: {
      full_name: 'Ghanshyam Shah',
      mobile: '9825054321',
      email: 'ghanshyam@shreeramtextiles.com',
      password_hash: defaultPasswordHash,
      status: 'ACTIVE',
    } as any,
  });

  const [company2] = await Company.findOrCreate({
    where: { gstin: '24BBBBB2222B1Z6' },
    defaults: {
      name: 'Shree Ram Textiles & Embroidery',
      gstin: '24BBBBB2222B1Z6',
      address: 'Ring Road Textile Market, Surat, Gujarat - 395003',
      phone: '9825054321',
      default_shift_hours: 12,
      machine_count: 2,
    } as any,
  });

  await UserCompanyRole.findOrCreate({
    where: { user_id: owner2.id, company_id: company2.id },
    defaults: {
      user_id: owner2.id,
      company_id: company2.id,
      role: Role.COMPANY_ADMIN,
      permissions: allPermissions,
      is_active: true,
    } as any,
  });

  // 4. Munim User (Accountant)
  const [munimUser] = await User.findOrCreate({
    where: { mobile: '9825099999' },
    defaults: {
      full_name: 'Kantibhai Accountant (Munim)',
      mobile: '9825099999',
      email: 'kantibhai.munim@gmail.com',
      password_hash: defaultPasswordHash,
      status: 'ACTIVE',
    } as any,
  });

  // Double Handshake: Munim <-> Company 1 (Accepted Collaboration)
  await MunimClient.findOrCreate({
    where: {
      munim_user_id: munimUser.id,
      company_id: company1.id,
    },
    defaults: {
      munim_user_id: munimUser.id,
      company_id: company1.id,
      initiator_type: MunimInitiatorType.MUNIM_TO_COMPANY,
      status: MunimRequestStatus.ACCEPTED,
      requested_by_user_id: munimUser.id,
      responded_by_user_id: owner1.id,
      request_notes: 'Monthly GST filing and fortnightly Karigar wage auditing',
      permissions: [
        Permission.DAYBOOK_VIEW,
        Permission.TALLY_EXPORT,
        Permission.INVOICE_READ,
        Permission.CHALLAN_READ,
        Permission.SHIFT_LOG_READ,
        Permission.UCHAPAT_READ,
        Permission.HISAB_GENERATE,
      ],
    } as any,
  });

  console.log('Seeding completed successfully!');
  console.log('Default Credentials:');
  console.log('  Owner 1 (Radhe Krishna):  Mobile: 9825012345 | Pass: Password@123');
  console.log('  Supervisor (Company 1):   Mobile: 9825099001 | Pass: Password@123');
  console.log('  Owner 2 (Shree Ram):      Mobile: 9825054321 | Pass: Password@123');
  console.log('  Munim (Accountant):       Mobile: 9825099999 | Pass: Password@123');
  console.log('  Super Admin:              Mobile: 9999999999 | Pass: Password@123');

  await sequelize.close();
}

runSeed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
