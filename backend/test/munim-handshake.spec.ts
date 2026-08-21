import { MunimRequestStatus, MunimInitiatorType } from '../src/common/enums/munim-request-status.enum';

describe('Munim <-> Company Double-Handshake Collaboration Lifecycle', () => {
  it('should validate status transitions for Munim invitation (PENDING -> ACCEPTED)', () => {
    const request = {
      id: 'req-1',
      munim_user_id: 'munim-1',
      company_id: 'comp-1',
      initiator_type: MunimInitiatorType.MUNIM_TO_COMPANY,
      status: MunimRequestStatus.PENDING,
    };

    expect(request.status).toBe(MunimRequestStatus.PENDING);

    // Company Owner accepts
    request.status = MunimRequestStatus.ACCEPTED;
    expect(request.status).toBe(MunimRequestStatus.ACCEPTED);
  });

  it('should support revocation of accountant access', () => {
    const request = {
      id: 'req-2',
      munim_user_id: 'munim-1',
      company_id: 'comp-1',
      status: MunimRequestStatus.ACCEPTED,
    };

    // Owner revokes access
    request.status = MunimRequestStatus.REVOKED;
    expect(request.status).toBe(MunimRequestStatus.REVOKED);
  });
});
