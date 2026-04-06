import { ClientSummary } from '../clients/clients.types';

export interface AllocationSummary {
  id: string;
  equipmentId: string;
  clientId: string;
  client: ClientSummary;
  allocatedAt: string;
  originatingLoanId: string | null;
  notes: string | null;
}
