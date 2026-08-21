import { TenantGuard } from '../src/common/guards/tenant.guard';
import { PermissionsGuard } from '../src/common/guards/permissions.guard';
import { Role } from '../src/common/enums/role.enum';
import { Permission } from '../src/common/enums/permission.enum';
import { ForbiddenException } from '@nestjs/common';

describe('Multi-Tenancy & Permission Matrix Isolation', () => {
  let permissionsGuard: PermissionsGuard;
  let mockReflector: any;

  beforeEach(() => {
    mockReflector = {
      getAllAndOverride: jest.fn(),
    };
    permissionsGuard = new PermissionsGuard(mockReflector);
  });

  it('should allow COMPANY_ADMIN full administrative bypass for company resources', () => {
    mockReflector.getAllAndOverride
      .mockReturnValueOnce(false) // isPublic
      .mockReturnValueOnce([Permission.INVOICE_CREATE]) // requiredPermissions
      .mockReturnValueOnce([Role.COMPANY_ADMIN]); // requiredRoles

    const mockContext: any = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'user-1', isSuperAdmin: false },
          companyRole: Role.COMPANY_ADMIN,
          companyPermissions: [],
        }),
      }),
    };

    const canActivate = permissionsGuard.canActivate(mockContext);
    expect(canActivate).toBe(true);
  });

  it('should allow SUPERVISOR with SHIFT_LOG permission to log shift counters', () => {
    mockReflector.getAllAndOverride
      .mockReturnValueOnce(false) // isPublic
      .mockReturnValueOnce([Permission.SHIFT_LOG]) // requiredPermissions
      .mockReturnValueOnce([]); // requiredRoles

    const mockContext: any = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'user-2' },
          companyRole: Role.SUPERVISOR,
          companyPermissions: [Permission.SHIFT_LOG, Permission.CHALLAN_READ],
        }),
      }),
    };

    const canActivate = permissionsGuard.canActivate(mockContext);
    expect(canActivate).toBe(true);
  });

  it('should reject KARIGAR_OPERATOR attempting to delete invoices', () => {
    mockReflector.getAllAndOverride
      .mockReturnValueOnce(false) // isPublic
      .mockReturnValueOnce([Permission.INVOICE_DELETE]) // requiredPermissions
      .mockReturnValueOnce([Role.COMPANY_ADMIN]); // requiredRoles

    const mockContext: any = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'user-3' },
          companyRole: Role.KARIGAR_OPERATOR,
          companyPermissions: [Permission.SHIFT_LOG],
        }),
      }),
    };

    expect(() => permissionsGuard.canActivate(mockContext)).toThrow(ForbiddenException);
  });

  it('should allow MUNIM with TALLY_EXPORT permission to export Tally Prime XML', () => {
    mockReflector.getAllAndOverride
      .mockReturnValueOnce(false) // isPublic
      .mockReturnValueOnce([Permission.TALLY_EXPORT]) // requiredPermissions
      .mockReturnValueOnce([]); // requiredRoles

    const mockContext: any = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'munim-user-1' },
          companyRole: Role.MUNIM,
          companyPermissions: [Permission.TALLY_EXPORT, Permission.DAYBOOK_VIEW],
        }),
      }),
    };

    const canActivate = permissionsGuard.canActivate(mockContext);
    expect(canActivate).toBe(true);
  });
});
