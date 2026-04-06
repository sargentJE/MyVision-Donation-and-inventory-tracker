'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  type NotificationSummary,
} from '@/hooks/use-notifications';
import { timeAgo } from '@/lib/date-utils';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Clock, CalendarX, MapPin, CheckCheck } from 'lucide-react';

const TYPE_ICONS: Record<string, typeof Clock> = {
  LOAN_OVERDUE: Clock,
  RESERVATION_EXPIRED: CalendarX,
  DEMO_VISIT_OVERDUE: MapPin,
};

interface NotificationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationDrawer({ open, onOpenChange }: NotificationDrawerProps) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useNotifications({ page });
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const notifications = data?.data ?? [];
  const meta = data?.meta;

  function handleClick(notification: NotificationSummary) {
    if (!notification.isRead) {
      markAsRead.mutate(notification.id);
    }
    if (notification.relatedEquipmentId) {
      router.push(`/equipment/${notification.relatedEquipmentId}`);
      onOpenChange(false);
    }
  }

  function handleMarkAllRead() {
    markAllAsRead.mutate();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader className="flex-row items-center justify-between space-y-0 pb-4">
          <SheetTitle>Notifications</SheetTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={markAllAsRead.isPending || notifications.every((n) => n.isRead)}
          >
            <CheckCheck className="mr-1 h-4 w-4" />
            Mark all read
          </Button>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div role="status" aria-label="Loading notifications">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="sr-only">Loading...</span>
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No notifications
            </p>
          ) : (
            <div className="space-y-1">
              {notifications.map((notification) => {
                const Icon = TYPE_ICONS[notification.type] ?? Clock;
                const isResolved = !!notification.resolvedAt;

                return (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => handleClick(notification)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-md p-3 text-left text-sm transition-colors',
                      'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      !notification.isRead && !isResolved && 'bg-muted/50',
                    )}
                  >
                    <Icon
                      className={cn(
                        'mt-0.5 h-4 w-4 shrink-0',
                        isResolved
                          ? 'text-muted-foreground'
                          : 'text-destructive',
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          'line-clamp-2',
                          !notification.isRead && !isResolved
                            ? 'font-medium'
                            : '',
                          isResolved ? 'text-muted-foreground' : '',
                        )}
                      >
                        {notification.message}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {timeAgo(notification.createdAt)}
                        {isResolved && ' · Resolved'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t pt-3 mt-2">
            <span className="text-xs text-muted-foreground">
              Page {meta.page} of {meta.totalPages}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
