'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  HandCoins,
  MoreHorizontal,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface BottomNavProps {
  userRole: string;
}

export function BottomNav({ userRole }: BottomNavProps) {
  const pathname = usePathname();

  function isActive(href: string) {
    return (
      pathname === href || (href !== '/' && pathname.startsWith(href))
    );
  }

  const linkClass = (href: string) =>
    cn(
      'flex flex-col items-center gap-0.5 text-xs min-w-[44px] min-h-[44px] justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-0',
      isActive(href) ? 'text-myvision-yellow' : 'text-white/80',
    );

  return (
    <nav aria-label="Mobile navigation" className="lg:hidden fixed bottom-0 left-0 right-0 border-t border-white/10 bg-myvision-dark-blue z-50">
      <div className="flex items-center justify-around py-1">
        <Link href="/" aria-current={isActive('/') ? 'page' : undefined} className={linkClass('/')}>
          <LayoutDashboard className="h-5 w-5" />
          <span>Dashboard</span>
        </Link>

        <Link href="/equipment" aria-current={isActive('/equipment') ? 'page' : undefined} className={linkClass('/equipment')}>
          <Package className="h-5 w-5" />
          <span>Inventory</span>
        </Link>

        <Link href="/loans" aria-current={isActive('/loans') ? 'page' : undefined} className={linkClass('/loans')}>
          <HandCoins className="h-5 w-5" />
          <span>Loans</span>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="More navigation options"
            className={cn(
              'group flex flex-col items-center gap-0.5 text-xs min-w-[44px] min-h-[44px] justify-center text-white/80',
              'data-[state=open]:text-myvision-yellow',
            )}
          >
            <div className="relative">
              <MoreHorizontal className="h-5 w-5" />
              {/* Round-4: chevron-up hint so users discover that the
                  button opens upward to reveal more nav items. Rotates
                  180° when the dropdown is open. */}
              <ChevronUp
                aria-hidden="true"
                className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 transition-transform group-data-[state=open]:rotate-180"
              />
            </div>
            <span>More</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top">
            <DropdownMenuItem asChild>
              <Link href="/clients">Clients</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/donations">Donations</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/reports">Reports</Link>
            </DropdownMenuItem>
            {userRole === 'ADMIN' && (
              <DropdownMenuItem asChild>
                <Link href="/admin/users">Admin</Link>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
