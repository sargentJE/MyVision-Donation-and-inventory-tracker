import {
  AcquisitionType,
  Condition,
  DeviceCategory,
  OperationalStatus,
} from '@prisma/client';

export interface EquipmentSummary {
  id: string;
  name: string;
  make: string | null;
  model: string | null;
  serialNumber: string | null;
  deviceCategory: DeviceCategory;
  acquisitionType: AcquisitionType;
  status: OperationalStatus;
  condition: Condition;
  isForSale: boolean;
  isArchived: boolean;
  acquiredAt: string;
  createdAt: string;
}

export interface DonationSummary {
  id: string;
  donorName: string;
  donorOrg: string | null;
  donatedAt: string;
}

export interface EquipmentDetail extends EquipmentSummary {
  conditionNotes: string | null;
  notes: string | null;
  purchasePrice: string | null;
  supplier: string | null;
  warrantyExpiry: string | null;
  decommissionedAt: string | null;
  decommissionReason: string | null;
  archivedAt: string | null;
  archiveReason: string | null;
  donation: DonationSummary | null;
  currentActivity: CurrentActivity;
}

export type CurrentActivity =
  | { type: 'reservation'; data: ReservationSummary }
  | { type: 'loan'; data: LoanSummary }
  | { type: 'allocation'; data: AllocationSummary }
  | { type: 'demoVisit'; data: DemoVisitSummary }
  | null;

export interface ClientSummary {
  id: string;
  charitylogId: string;
  displayName: string;
}

export interface ReservationSummary {
  id: string;
  client: ClientSummary;
  reservedAt: string;
  expiresAt: string | null;
  notes: string | null;
}

export interface LoanSummary {
  id: string;
  client: ClientSummary;
  loanedAt: string;
  expectedReturn: string | null;
  notes: string | null;
}

export interface AllocationSummary {
  id: string;
  client: ClientSummary;
  allocatedAt: string;
  originatingLoanId: string | null;
  notes: string | null;
}

export interface DemoVisitSummary {
  id: string;
  equipmentId: string;
  destination: string | null;
  startedAt: string;
  expectedReturn: string | null;
  returnedAt: string | null;
  closedReason: string | null;
  notes: string | null;
}
