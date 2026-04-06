import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TableRow, TableCell } from '@/components/ui/table';

interface TableEmptyStateProps {
  colSpan: number;
  icon: LucideIcon;
  message: string;
  action?: { label: string; href: string };
}

export function TableEmptyState({ colSpan, icon: Icon, message, action }: TableEmptyStateProps) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-12">
        <div className="flex flex-col items-center gap-3 text-center">
          <Icon className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">{message}</p>
          {action && (
            <Button asChild variant="outline" size="sm">
              <Link href={action.href}>{action.label}</Link>
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
