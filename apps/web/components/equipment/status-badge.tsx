import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  AVAILABLE_FOR_LOAN: {
    label: 'Available for Loan',
    className: 'bg-green-100 text-green-800 hover:bg-green-100',
  },
  RESERVED: {
    label: 'Reserved',
    className: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
  },
  ON_LOAN: {
    label: 'On Loan',
    className: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  },
  ALLOCATED_OUT: {
    label: 'Allocated Out',
    className: 'bg-purple-100 text-purple-800 hover:bg-purple-100',
  },
  AVAILABLE_FOR_DEMO: {
    label: 'Available for Demo',
    className: 'bg-green-100 text-green-800 hover:bg-green-100',
  },
  ON_DEMO_VISIT: {
    label: 'On Demo Visit',
    className: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  },
  DECOMMISSIONED: {
    label: 'Decommissioned',
    className: 'bg-red-100 text-red-800 hover:bg-red-100',
  },
};

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    className: '',
  };
  return (
    <Badge variant="outline" className={cn('font-medium', config.className)}>
      {config.label}
    </Badge>
  );
}
