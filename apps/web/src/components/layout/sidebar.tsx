'use client';

import { useState } from 'react';
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
  ChevronDown,
  Droplets,
} from 'lucide-react';

type NavItem = {
  name: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: { name: string; href: string; icon: React.ComponentType<{ className?: string }> }[];
};

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Roster', href: '/dashboard/roster', icon: Users },
  { name: 'Items', href: '/dashboard/items', icon: Package },
  { name: 'BiS Lists', href: '/dashboard/bis', icon: Scroll },
  { name: 'Attendance', href: '/dashboard/attendance', icon: Calendar },
  { name: 'Raid Splits', href: '/dashboard/splits', icon: Users2 },
  { name: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
  {
    name: 'Loot Council',
    icon: Sword,
    children: [
      { name: 'Drops', href: '/dashboard/loot', icon: Droplets },
    ]
  },
];

const bottomNavigation = [
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = useState<string[]>(() => {
    // Auto-expand menus that contain the current path
    const expanded: string[] = [];
    navigation.forEach((item) => {
      if (item.children?.some((child) => pathname.startsWith(child.href))) {
        expanded.push(item.name);
      }
    });
    return expanded;
  });

  const toggleMenu = (name: string) => {
    setOpenMenus((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

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
            const hasChildren = item.children && item.children.length > 0;
            const isOpen = openMenus.includes(item.name);
            const isChildActive = item.children?.some((child) => pathname.startsWith(child.href));
            const isActive = item.href
              ? pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
              : isChildActive;

            if (hasChildren) {
              return (
                <li key={item.name}>
                  <button
                    onClick={() => toggleMenu(item.name)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'text-primary'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                    <ChevronDown
                      className={cn(
                        'ml-auto h-4 w-4 transition-transform',
                        isOpen && 'rotate-180'
                      )}
                    />
                  </button>
                  {isOpen && (
                    <ul className="mt-1 space-y-1 pl-4">
                      {item.children!.map((child) => {
                        const isChildItemActive = pathname.startsWith(child.href);
                        return (
                          <li key={child.name}>
                            <Link
                              href={child.href}
                              className={cn(
                                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                isChildItemActive
                                  ? 'bg-primary/10 text-primary'
                                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                              )}
                            >
                              <child.icon className="h-4 w-4" />
                              {child.name}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            }

            return (
              <li key={item.name}>
                <Link
                  href={item.href!}
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
