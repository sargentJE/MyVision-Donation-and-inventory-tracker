'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  HandCoins,
  Users,
  Gift,
  BarChart3,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Inventory', href: '/equipment', icon: Package },
  { label: 'Loans', href: '/loans', icon: HandCoins },
  { label: 'Clients', href: '/clients', icon: Users },
  { label: 'Donations', href: '/donations', icon: Gift },
  { label: 'Reports', href: '/reports', icon: BarChart3 },
  { label: 'Admin', href: '/admin/users', icon: Shield, adminOnly: true },
];

interface SidebarProps {
  userRole: string;
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();

  const visibleItems = navItems.filter(
    (item) => !item.adminOnly || userRole === 'ADMIN',
  );

  return (
    <aside className="hidden lg:flex w-64 flex-col bg-myvision-dark-blue">
      <div className="flex h-14 items-center border-b border-white/10 px-4">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/myvision-logo.svg" alt="MyVision Oxfordshire — home" className="h-6 brightness-0 invert" />
        </Link>
      </div>
      <nav aria-label="Main navigation" className="flex-1 space-y-1 p-2">
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-0',
                isActive
                  ? 'border-l-2 border-myvision-yellow bg-white/10 text-white'
                  : 'text-white/80 hover:bg-white/5 hover:text-white',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
