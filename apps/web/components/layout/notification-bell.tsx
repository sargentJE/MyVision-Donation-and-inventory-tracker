'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useNotificationCount } from '@/hooks/use-notifications';
import { Button } from '@/components/ui/button';
import { NotificationDrawer } from './notification-drawer';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data } = useNotificationCount();
  const count = data?.data.count ?? 0;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen(true)}
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {count > 99 ? '99+' : count}
          </span>
        )}
        <span className="sr-only">
          Notifications{count > 0 ? ` (${count} unread)` : ''}
        </span>
      </Button>

      <NotificationDrawer open={open} onOpenChange={setOpen} />
    </>
  );
}
