import { ClientSummary } from '../clients/clients.types';

export interface ReservationSummary {
  id: string;
  equipmentId: string;
  clientId: string;
  client: ClientSummary;
  reservedAt: string;
  expiresAt: string | null;
  closedAt: string | null;
  closedReason: string | null;
}
