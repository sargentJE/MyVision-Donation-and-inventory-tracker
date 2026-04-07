'use client';

import { usePathname } from 'next/navigation';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserMenu } from './user-menu';
import { NotificationBell } from './notification-bell';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/equipment': 'Inventory',
  '/equipment/new': 'Add Equipment',
  '/equipment/labels/print': 'Print Labels',
  '/loans': 'Loans',
  '/clients': 'Clients',
  '/donations': 'Donations',
  '/reports': 'Reports',
  '/admin/users': 'User Management',
  '/settings': 'Account Settings',
};

function getPageTitle(pathname: string): string {
  // Specific match wins over prefix fallbacks below.
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  // Sub-route specifics that aren't worth listing individually.
  if (pathname.match(/^\/equipment\/[^/]+\/label$/)) return 'Print Label';
  // Match dynamic routes like /equipment/[id]
  if (pathname.startsWith('/equipment/')) return 'Item Detail';
  if (pathname.startsWith('/loans/')) return 'Loan Detail';
  if (pathname.startsWith('/clients/')) return 'Client Detail';
  if (pathname.startsWith('/donations/')) return 'Donation Detail';
  return '';
}

interface HeaderProps {
  userName: string;
  userRole: string;
  onLogout: () => void;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export function Header({
  userName,
  userRole,
  onLogout,
  sidebarCollapsed,
  onToggleSidebar,
}: HeaderProps) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header className="h-14 border-b flex items-center px-4 gap-3">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onToggleSidebar}
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-expanded={!sidebarCollapsed}
        aria-controls="main-sidebar"
        className="hidden lg:inline-flex"
      >
        {sidebarCollapsed ? (
          <PanelLeftOpen className="h-4 w-4" />
        ) : (
          <PanelLeftClose className="h-4 w-4" />
        )}
      </Button>

      <h2 className="text-sm font-medium text-muted-foreground truncate">
        {title}
      </h2>

      <div className="flex items-center gap-2 ml-auto">
        <NotificationBell />

        <UserMenu name={userName} role={userRole} onLogout={onLogout} />
      </div>
    </header>
  );
}
