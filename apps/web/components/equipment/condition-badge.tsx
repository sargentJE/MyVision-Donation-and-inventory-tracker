import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const CONDITION_CONFIG: Record<string, { label: string; className: string }> = {
  GOOD: {
    label: 'Good',
    className: 'bg-green-100 text-green-800 hover:bg-green-100',
  },
  FAIR: {
    label: 'Fair',
    className: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
  },
  POOR: {
    label: 'Poor',
    className: 'bg-red-100 text-red-800 hover:bg-red-100',
  },
};

export function ConditionBadge({ condition }: { condition: string }) {
  const config = CONDITION_CONFIG[condition] ?? {
    label: condition,
    className: '',
  };
  return (
    <Badge variant="outline" className={cn('font-medium', config.className)}>
      {config.label}
    </Badge>
  );
}
