export interface ClientSummary {
  id: string;
  charitylogId: string;
  displayName: string;
  isAnonymised: boolean;
}

export interface ClientLoanSummary {
  id: string;
  equipmentId: string;
  equipmentName: string;
  loanedAt: string;
  expectedReturn: string | null;
  returnedAt: string | null;
  closedReason: string | null;
}

export interface ClientAllocationSummary {
  id: string;
  equipmentId: string;
  equipmentName: string;
  allocatedAt: string;
  originatingLoanId: string | null;
}

export interface ClientDetail extends ClientSummary {
  createdAt: string;
  anonymisedAt: string | null;
  loans: ClientLoanSummary[];
  allocations: ClientAllocationSummary[];
}
