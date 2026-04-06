'use client';

import { usePathname } from 'next/navigation';
import { UserMenu } from './user-menu';
import { NotificationBell } from './notification-bell';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/equipment': 'Inventory',
  '/equipment/new': 'Add Equipment',
  '/loans': 'Loans',
  '/clients': 'Clients',
  '/donations': 'Donations',
  '/reports': 'Reports',
  '/admin/users': 'User Management',
  '/settings': 'Account Settings',
};

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
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
}

export function Header({ userName, userRole, onLogout }: HeaderProps) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header className="h-14 border-b flex items-center justify-between px-4">
      <h2 className="text-sm font-medium text-muted-foreground">
        {title}
      </h2>

      <div className="flex items-center gap-2 ml-auto">
        <NotificationBell />

        <UserMenu name={userName} role={userRole} onLogout={onLogout} />
      </div>
    </header>
  );
}
