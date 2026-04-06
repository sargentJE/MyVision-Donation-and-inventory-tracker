'use client';

import { Separator } from '@/components/ui/separator';
import { ReservationCard } from './reservation-card';
import { LoanCard } from './loan-card';
import { AllocationCard } from './allocation-card';
import { DemoVisitCard } from './demo-visit-card';

interface CurrentActivity {
  type: 'reservation' | 'loan' | 'allocation' | 'demoVisit';
  data: Record<string, unknown>;
}

interface CurrentActivityPanelProps {
  activity: CurrentActivity | null;
  equipmentId: string;
  onActionComplete: () => void;
}

export function CurrentActivityPanel({
  activity,
  equipmentId,
  onActionComplete,
}: CurrentActivityPanelProps) {
  if (!activity) return null;

  return (
    <>
      <Separator />
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          Current Activity
        </h3>

        {activity.type === 'reservation' && (
          <ReservationCard
            data={activity.data}
            equipmentId={equipmentId}
            onActionComplete={onActionComplete}
          />
        )}

        {activity.type === 'loan' && (
          <LoanCard
            data={activity.data}
            equipmentId={equipmentId}
            onActionComplete={onActionComplete}
          />
        )}

        {activity.type === 'allocation' && (
          <AllocationCard data={activity.data} />
        )}

        {activity.type === 'demoVisit' && (
          <DemoVisitCard
            data={activity.data}
            equipmentId={equipmentId}
            onActionComplete={onActionComplete}
          />
        )}
      </div>
    </>
  );
}
