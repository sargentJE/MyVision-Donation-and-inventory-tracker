import { Badge } from '@/components/ui/badge';

const LABELS: Record<string, string> = {
  PURCHASED: 'Purchased',
  DONATED_DEMO: 'Donated (Demo)',
  DONATED_GIVEABLE: 'Donated (Giveable)',
};

export function AcquisitionBadge({
  acquisitionType,
}: {
  acquisitionType: string;
}) {
  return (
    <Badge variant="secondary">
      {LABELS[acquisitionType] ?? acquisitionType}
    </Badge>
  );
}
