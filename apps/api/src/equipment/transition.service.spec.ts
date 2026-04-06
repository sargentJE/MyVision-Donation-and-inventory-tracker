import { AcquisitionType, OperationalStatus, Role } from '@prisma/client';
import { TransitionService } from './transition.service';

describe('TransitionService', () => {
  let service: TransitionService;

  beforeEach(() => {
    service = new TransitionService();
  });

  // ─── getInitialStatus ────────────────────────────────

  describe('getInitialStatus', () => {
    it('PURCHASED → AVAILABLE_FOR_DEMO', () => {
      expect(service.getInitialStatus(AcquisitionType.PURCHASED)).toBe(
        OperationalStatus.AVAILABLE_FOR_DEMO,
      );
    });

    it('DONATED_DEMO → AVAILABLE_FOR_DEMO', () => {
      expect(service.getInitialStatus(AcquisitionType.DONATED_DEMO)).toBe(
        OperationalStatus.AVAILABLE_FOR_DEMO,
      );
    });

    it('DONATED_GIVEABLE → AVAILABLE_FOR_LOAN', () => {
      expect(service.getInitialStatus(AcquisitionType.DONATED_GIVEABLE)).toBe(
        OperationalStatus.AVAILABLE_FOR_LOAN,
      );
    });
  });

  // ─── validateReclassification ────────────────────────

  describe('validateReclassification', () => {
    // DECOMMISSIONED is always compatible with any target
    it.each([
      AcquisitionType.PURCHASED,
      AcquisitionType.DONATED_DEMO,
      AcquisitionType.DONATED_GIVEABLE,
    ])('DECOMMISSIONED → %s: allowed', (target) => {
      const result = service.validateReclassification(
        OperationalStatus.DECOMMISSIONED,
        target,
      );
      expect(result.allowed).toBe(true);
      expect(result.autoTransitionTo).toBeUndefined();
    });

    // Same-pathway reclassification (no status change needed)
    describe('compatible — same pathway', () => {
      it('AVAILABLE_FOR_LOAN → DONATED_GIVEABLE: allowed, no transition', () => {
        const result = service.validateReclassification(
          OperationalStatus.AVAILABLE_FOR_LOAN,
          AcquisitionType.DONATED_GIVEABLE,
        );
        expect(result).toEqual({ allowed: true });
      });

      it('RESERVED → DONATED_GIVEABLE: allowed, no transition', () => {
        const result = service.validateReclassification(
          OperationalStatus.RESERVED,
          AcquisitionType.DONATED_GIVEABLE,
        );
        expect(result).toEqual({ allowed: true });
      });

      it('ON_LOAN → DONATED_GIVEABLE: allowed, no transition', () => {
        const result = service.validateReclassification(
          OperationalStatus.ON_LOAN,
          AcquisitionType.DONATED_GIVEABLE,
        );
        expect(result).toEqual({ allowed: true });
      });

      it('ALLOCATED_OUT → DONATED_GIVEABLE: allowed, no transition', () => {
        const result = service.validateReclassification(
          OperationalStatus.ALLOCATED_OUT,
          AcquisitionType.DONATED_GIVEABLE,
        );
        expect(result).toEqual({ allowed: true });
      });

      it('AVAILABLE_FOR_DEMO → PURCHASED: allowed, no transition', () => {
        const result = service.validateReclassification(
          OperationalStatus.AVAILABLE_FOR_DEMO,
          AcquisitionType.PURCHASED,
        );
        expect(result).toEqual({ allowed: true });
      });

      it('ON_DEMO_VISIT → DONATED_DEMO: allowed, no transition', () => {
        const result = service.validateReclassification(
          OperationalStatus.ON_DEMO_VISIT,
          AcquisitionType.DONATED_DEMO,
        );
        expect(result).toEqual({ allowed: true });
      });
    });

    // Cross-pathway idle — auto-transition
    describe('incompatible idle — auto-transition', () => {
      it('AVAILABLE_FOR_DEMO → DONATED_GIVEABLE: auto-transition to AVAILABLE_FOR_LOAN', () => {
        const result = service.validateReclassification(
          OperationalStatus.AVAILABLE_FOR_DEMO,
          AcquisitionType.DONATED_GIVEABLE,
        );
        expect(result.allowed).toBe(true);
        expect(result.autoTransitionTo).toBe(
          OperationalStatus.AVAILABLE_FOR_LOAN,
        );
      });

      it('AVAILABLE_FOR_LOAN → PURCHASED: auto-transition to AVAILABLE_FOR_DEMO', () => {
        const result = service.validateReclassification(
          OperationalStatus.AVAILABLE_FOR_LOAN,
          AcquisitionType.PURCHASED,
        );
        expect(result.allowed).toBe(true);
        expect(result.autoTransitionTo).toBe(
          OperationalStatus.AVAILABLE_FOR_DEMO,
        );
      });

      it('AVAILABLE_FOR_LOAN → DONATED_DEMO: auto-transition to AVAILABLE_FOR_DEMO', () => {
        const result = service.validateReclassification(
          OperationalStatus.AVAILABLE_FOR_LOAN,
          AcquisitionType.DONATED_DEMO,
        );
        expect(result.allowed).toBe(true);
        expect(result.autoTransitionTo).toBe(
          OperationalStatus.AVAILABLE_FOR_DEMO,
        );
      });
    });

    // Cross-pathway active — blocked
    describe('incompatible active — blocked', () => {
      it('ON_DEMO_VISIT → DONATED_GIVEABLE: blocked', () => {
        const result = service.validateReclassification(
          OperationalStatus.ON_DEMO_VISIT,
          AcquisitionType.DONATED_GIVEABLE,
        );
        expect(result.allowed).toBe(false);
        expect(result.blockReason).toContain('demo visit');
      });

      it('ON_LOAN → PURCHASED: blocked', () => {
        const result = service.validateReclassification(
          OperationalStatus.ON_LOAN,
          AcquisitionType.PURCHASED,
        );
        expect(result.allowed).toBe(false);
        expect(result.blockReason).toContain('on loan');
      });

      it('RESERVED → DONATED_DEMO: blocked', () => {
        const result = service.validateReclassification(
          OperationalStatus.RESERVED,
          AcquisitionType.DONATED_DEMO,
        );
        expect(result.allowed).toBe(false);
        expect(result.blockReason).toContain('reservation');
      });

      it('ALLOCATED_OUT → PURCHASED: blocked', () => {
        const result = service.validateReclassification(
          OperationalStatus.ALLOCATED_OUT,
          AcquisitionType.PURCHASED,
        );
        expect(result.allowed).toBe(false);
        expect(result.blockReason).toContain('permanently allocated');
      });
    });
  });

  // ─── canDecommission ─────────────────────────────────

  describe('canDecommission', () => {
    it.each([
      OperationalStatus.AVAILABLE_FOR_LOAN,
      OperationalStatus.RESERVED,
      OperationalStatus.ON_LOAN,
      OperationalStatus.ALLOCATED_OUT,
      OperationalStatus.AVAILABLE_FOR_DEMO,
      OperationalStatus.ON_DEMO_VISIT,
    ])('%s → can decommission', (status) => {
      expect(service.canDecommission(status)).toBe(true);
    });

    it('DECOMMISSIONED → cannot decommission again', () => {
      expect(service.canDecommission(OperationalStatus.DECOMMISSIONED)).toBe(
        false,
      );
    });
  });

  // ─── canFlagForSale ──────────────────────────────────

  describe('canFlagForSale', () => {
    it('PURCHASED + AVAILABLE_FOR_DEMO → allowed', () => {
      expect(
        service.canFlagForSale(
          AcquisitionType.PURCHASED,
          OperationalStatus.AVAILABLE_FOR_DEMO,
        ),
      ).toEqual({ allowed: true });
    });

    it('DONATED_GIVEABLE → not allowed', () => {
      const result = service.canFlagForSale(
        AcquisitionType.DONATED_GIVEABLE,
        OperationalStatus.AVAILABLE_FOR_LOAN,
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('purchased');
    });

    it('PURCHASED + DECOMMISSIONED → not allowed', () => {
      const result = service.canFlagForSale(
        AcquisitionType.PURCHASED,
        OperationalStatus.DECOMMISSIONED,
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Decommissioned');
    });
  });

  // ─── getAvailableActions ─────────────────────────────

  describe('getAvailableActions', () => {
    it('AVAILABLE_FOR_LOAN Staff: reserve, issue_loan, allocate, edit, print', () => {
      const actions = service.getAvailableActions(
        OperationalStatus.AVAILABLE_FOR_LOAN,
        AcquisitionType.DONATED_GIVEABLE,
        Role.STAFF,
        false,
        false,
      );
      expect(actions).toContain('reserve');
      expect(actions).toContain('issue_loan');
      expect(actions).toContain('allocate_directly');
      expect(actions).toContain('edit');
      expect(actions).toContain('print_qr');
      expect(actions).not.toContain('decommission');
      expect(actions).not.toContain('archive');
    });

    it('AVAILABLE_FOR_LOAN Admin: includes decommission, archive, reclassify', () => {
      const actions = service.getAvailableActions(
        OperationalStatus.AVAILABLE_FOR_LOAN,
        AcquisitionType.DONATED_GIVEABLE,
        Role.ADMIN,
        false,
        false,
      );
      expect(actions).toContain('decommission');
      expect(actions).toContain('archive');
      expect(actions).toContain('reclassify');
    });

    it('AVAILABLE_FOR_DEMO Staff: start_demo_visit, edit, print', () => {
      const actions = service.getAvailableActions(
        OperationalStatus.AVAILABLE_FOR_DEMO,
        AcquisitionType.PURCHASED,
        Role.STAFF,
        false,
        false,
      );
      expect(actions).toContain('start_demo_visit');
      expect(actions).toContain('edit');
      expect(actions).not.toContain('reserve');
      expect(actions).not.toContain('issue_loan');
    });

    it('ON_LOAN Staff: return, convert_to_allocation', () => {
      const actions = service.getAvailableActions(
        OperationalStatus.ON_LOAN,
        AcquisitionType.DONATED_GIVEABLE,
        Role.STAFF,
        false,
        false,
      );
      expect(actions).toContain('return_loan');
      expect(actions).toContain('convert_to_allocation');
      expect(actions).not.toContain('decommission');
    });

    it('DECOMMISSIONED Admin: print_qr, edit (notes only), archive', () => {
      const actions = service.getAvailableActions(
        OperationalStatus.DECOMMISSIONED,
        AcquisitionType.PURCHASED,
        Role.ADMIN,
        false,
        false,
      );
      expect(actions).toContain('print_qr');
      expect(actions).toContain('edit');
      expect(actions).toContain('archive');
      expect(actions).not.toContain('decommission');
    });

    it('DECOMMISSIONED Staff: print_qr only', () => {
      const actions = service.getAvailableActions(
        OperationalStatus.DECOMMISSIONED,
        AcquisitionType.PURCHASED,
        Role.STAFF,
        false,
        false,
      );
      expect(actions).toContain('print_qr');
      expect(actions).not.toContain('edit');
      expect(actions).not.toContain('archive');
    });

    it('PURCHASED Admin: includes flag_for_sale when not flagged', () => {
      const actions = service.getAvailableActions(
        OperationalStatus.AVAILABLE_FOR_DEMO,
        AcquisitionType.PURCHASED,
        Role.ADMIN,
        false,
        false,
      );
      expect(actions).toContain('flag_for_sale');
      expect(actions).not.toContain('unflag_for_sale');
    });

    it('PURCHASED Admin: includes unflag_for_sale when flagged', () => {
      const actions = service.getAvailableActions(
        OperationalStatus.AVAILABLE_FOR_DEMO,
        AcquisitionType.PURCHASED,
        Role.ADMIN,
        true,
        false,
      );
      expect(actions).toContain('unflag_for_sale');
      expect(actions).not.toContain('flag_for_sale');
    });

    it('archived Admin: includes restore', () => {
      const actions = service.getAvailableActions(
        OperationalStatus.DECOMMISSIONED,
        AcquisitionType.PURCHASED,
        Role.ADMIN,
        false,
        true,
      );
      expect(actions).toContain('restore');
    });

    it('DONATED_GIVEABLE Staff: no flag_for_sale', () => {
      const actions = service.getAvailableActions(
        OperationalStatus.AVAILABLE_FOR_LOAN,
        AcquisitionType.DONATED_GIVEABLE,
        Role.STAFF,
        false,
        false,
      );
      expect(actions).not.toContain('flag_for_sale');
      expect(actions).not.toContain('unflag_for_sale');
    });
  });
});
