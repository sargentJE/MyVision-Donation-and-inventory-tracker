import { ClientSummary } from '../clients/clients.types';

export interface LoanSummary {
  id: string;
  equipmentId: string;
  clientId: string;
  client: ClientSummary;
  loanedAt: string;
  expectedReturn: string | null;
  returnedAt: string | null;
  conditionAtLoan: string | null;
  closedReason: string | null;
}
