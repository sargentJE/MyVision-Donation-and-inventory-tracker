import { Injectable } from '@nestjs/common';
import { AcquisitionType, OperationalStatus, Role } from '@prisma/client';

export type EquipmentAction =
  | 'reserve'
  | 'issue_loan'
  | 'allocate_directly'
  | 'cancel_reservation'
  | 'convert_to_loan'
  | 'return_loan'
  | 'convert_to_allocation'
  | 'start_demo_visit'
  | 'return_demo_visit'
  | 'edit'
  | 'print_qr'
  | 'decommission'
  | 'archive'
  | 'restore'
  | 'reclassify'
  | 'flag_for_sale'
  | 'unflag_for_sale';

const LOANABLE_STATUSES = new Set<OperationalStatus>([
  OperationalStatus.AVAILABLE_FOR_LOAN,
  OperationalStatus.RESERVED,
  OperationalStatus.ON_LOAN,
  OperationalStatus.ALLOCATED_OUT,
]);

const DEMO_STATUSES = new Set<OperationalStatus>([
  OperationalStatus.AVAILABLE_FOR_DEMO,
  OperationalStatus.ON_DEMO_VISIT,
]);

const ACTIVE_STATUSES = new Set<OperationalStatus>([
  OperationalStatus.RESERVED,
  OperationalStatus.ON_LOAN,
  OperationalStatus.ALLOCATED_OUT,
  OperationalStatus.ON_DEMO_VISIT,
]);

const BLOCK_REASONS: Partial<Record<OperationalStatus, string>> = {
  [OperationalStatus.ON_DEMO_VISIT]:
    'Cannot reclassify while item is on a demo visit. Return the item first.',
  [OperationalStatus.ON_LOAN]:
    'Cannot reclassify while item is on loan. Return the item first.',
  [OperationalStatus.RESERVED]:
    'Cannot reclassify while item has an active reservation. Cancel the reservation first.',
  [OperationalStatus.ALLOCATED_OUT]:
    'Cannot reclassify while item is permanently allocated.',
};

interface ReclassifyResult {
  allowed: boolean;
  autoTransitionTo?: OperationalStatus;
  blockReason?: string;
}

function isLoanableTarget(type: AcquisitionType): boolean {
  return type === AcquisitionType.DONATED_GIVEABLE;
}

@Injectable()
export class TransitionService {
  getInitialStatus(acquisitionType: AcquisitionType): OperationalStatus {
    return isLoanableTarget(acquisitionType)
      ? OperationalStatus.AVAILABLE_FOR_LOAN
      : OperationalStatus.AVAILABLE_FOR_DEMO;
  }

  validateReclassification(
    currentStatus: OperationalStatus,
    targetAcquisitionType: AcquisitionType,
  ): ReclassifyResult {
    // DECOMMISSIONED is always compatible
    if (currentStatus === OperationalStatus.DECOMMISSIONED) {
      return { allowed: true };
    }

    const targetIsLoanable = isLoanableTarget(targetAcquisitionType);
    const statusInTargetPathway = targetIsLoanable
      ? LOANABLE_STATUSES.has(currentStatus)
      : DEMO_STATUSES.has(currentStatus);

    // Current status already belongs to the target pathway — no change needed
    if (statusInTargetPathway) {
      return { allowed: true };
    }

    // Status is in the wrong pathway — check if active (blocked) or idle (auto-transition)
    if (ACTIVE_STATUSES.has(currentStatus)) {
      return {
        allowed: false,
        blockReason: BLOCK_REASONS[currentStatus] ?? 'Cannot reclassify in current status.',
      };
    }

    // Idle status in wrong pathway — auto-transition
    const autoTransitionTo = targetIsLoanable
      ? OperationalStatus.AVAILABLE_FOR_LOAN
      : OperationalStatus.AVAILABLE_FOR_DEMO;

    return { allowed: true, autoTransitionTo };
  }

  canDecommission(currentStatus: OperationalStatus): boolean {
    return currentStatus !== OperationalStatus.DECOMMISSIONED;
  }

  canFlagForSale(
    acquisitionType: AcquisitionType,
    status: OperationalStatus,
  ): { allowed: boolean; reason?: string } {
    if (acquisitionType !== AcquisitionType.PURCHASED) {
      return { allowed: false, reason: 'Only purchased items can be flagged for sale' };
    }
    if (status === OperationalStatus.DECOMMISSIONED) {
      return { allowed: false, reason: 'Decommissioned items cannot be flagged for sale' };
    }
    return { allowed: true };
  }

  /**
   * Returns the list of actions available for the given equipment state and user role.
   * Drives the frontend action matrix — buttons shown (not disabled) per PRD.
   */
  getAvailableActions(
    status: OperationalStatus,
    acquisitionType: AcquisitionType,
    role: Role,
    isForSale: boolean,
    isArchived: boolean,
  ): EquipmentAction[] {
    const actions: EquipmentAction[] = [];
    const isAdmin = role === Role.ADMIN;

    switch (status) {
      case OperationalStatus.AVAILABLE_FOR_LOAN:
        actions.push('reserve', 'issue_loan', 'allocate_directly', 'edit', 'print_qr');
        if (isAdmin) actions.push('decommission', 'archive', 'reclassify');
        break;

      case OperationalStatus.RESERVED:
        actions.push('convert_to_loan', 'cancel_reservation', 'edit', 'print_qr');
        if (isAdmin) actions.push('decommission', 'reclassify');
        break;

      case OperationalStatus.ON_LOAN:
        actions.push('return_loan', 'convert_to_allocation', 'edit', 'print_qr');
        if (isAdmin) actions.push('decommission');
        break;

      case OperationalStatus.ALLOCATED_OUT:
        actions.push('edit', 'print_qr');
        if (isAdmin) actions.push('decommission', 'archive');
        break;

      case OperationalStatus.AVAILABLE_FOR_DEMO:
        actions.push('start_demo_visit', 'edit', 'print_qr');
        if (isAdmin) actions.push('decommission', 'archive', 'reclassify');
        break;

      case OperationalStatus.ON_DEMO_VISIT:
        actions.push('return_demo_visit', 'edit', 'print_qr');
        if (isAdmin) actions.push('decommission');
        break;

      case OperationalStatus.DECOMMISSIONED:
        actions.push('print_qr');
        if (isAdmin) actions.push('edit', 'archive');
        break;
    }

    // Flag/unflag for sale — Admin only, PURCHASED only, not DECOMMISSIONED
    if (isAdmin && acquisitionType === AcquisitionType.PURCHASED && status !== OperationalStatus.DECOMMISSIONED) {
      actions.push(isForSale ? 'unflag_for_sale' : 'flag_for_sale');
    }

    // Archived items can be restored (Admin only)
    if (isAdmin && isArchived) {
      actions.push('restore');
    }

    return actions;
  }
}
