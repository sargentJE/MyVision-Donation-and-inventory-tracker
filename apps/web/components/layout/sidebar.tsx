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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  collapsed: boolean;
}

export function Sidebar({ userRole, collapsed }: SidebarProps) {
  const pathname = usePathname();

  const visibleItems = navItems.filter(
    (item) => !item.adminOnly || userRole === 'ADMIN',
  );

  return (
    <aside
      id="main-sidebar"
      className={cn(
        'hidden lg:flex flex-col bg-myvision-dark-blue overflow-hidden transition-[width] duration-200 motion-reduce:transition-none',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      <div
        className={cn(
          'flex h-14 items-center border-b border-white/10',
          collapsed ? 'justify-center px-0' : 'px-4',
        )}
      >
        <Link
          href="/"
          className="flex items-center gap-2"
          aria-label="MyVision Oxfordshire — home"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/myvision-logo.svg"
            alt=""
            className="h-6 brightness-0 invert"
          />
        </Link>
      </div>
      <TooltipProvider delayDuration={300} disableHoverableContent>
        <nav aria-label="Main navigation" className="flex-1 space-y-1 p-2">
          {visibleItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));

            const link = (
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                aria-label={collapsed ? item.label : undefined}
                className={cn(
                  'flex items-center rounded-md py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-0 overflow-hidden',
                  // gap and padding collapse together so the icon stays
                  // perfectly centred on the 64px rail.
                  collapsed ? 'justify-center gap-0 px-0' : 'gap-3 px-3',
                  isActive
                    ? 'border-l-2 border-myvision-yellow bg-white/10 text-white'
                    : 'text-white/80 hover:bg-white/5 hover:text-white',
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span
                  // aria-hidden when collapsed: aria-label on the link is the
                  // accessible name; double-announcing the visible-but-faded
                  // text confuses some screen readers.
                  aria-hidden={collapsed || undefined}
                  className={cn(
                    'whitespace-nowrap transition-[opacity,width] duration-200 motion-reduce:transition-none',
                    collapsed && 'w-0 opacity-0 pointer-events-none',
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );

            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right">{item.label}</TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </nav>
      </TooltipProvider>
    </aside>
  );
}
