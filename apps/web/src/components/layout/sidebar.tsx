'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Sword,
  Package,
  Calendar,
  Users2,
  BarChart3,
  Settings,
  Scroll,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Roster', href: '/dashboard/roster', icon: Users },
  { name: 'Loot Council', href: '/dashboard/loot', icon: Sword },
  { name: 'Items', href: '/dashboard/items', icon: Package },
  { name: 'BiS Lists', href: '/dashboard/bis', icon: Scroll },
  { name: 'Attendance', href: '/dashboard/attendance', icon: Calendar },
  { name: 'Raid Splits', href: '/dashboard/splits', icon: Users2 },
  { name: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
];

const bottomNavigation = [
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-card border-r border-border">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center justify-center border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-3">
          <Image
            src="/images/hlg-icon.png"
            alt="HOOLIGANS"
            width={36}
            height={36}
            className="rounded-lg"
          />
          <span className="font-bold text-lg text-foreground">HOOLIGANS</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col px-3 py-4">
        <ul role="list" className="flex flex-1 flex-col gap-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Bottom Navigation */}
        <ul role="list" className="mt-auto space-y-1">
          {bottomNavigation.map((item) => {
            const isActive = pathname === item.href;

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
