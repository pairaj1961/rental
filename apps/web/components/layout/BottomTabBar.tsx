'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ClipboardList, Package, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/rentals', icon: ClipboardList, label: 'Rentals' },
  { href: '/equipment', icon: Package, label: 'Equipment' },
  { href: '/customers', icon: User, label: 'Customers' },
];

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 grid border-t bg-white md:hidden"
      style={{
        gridTemplateColumns: `repeat(${TABS.length}, 1fr)`,
        height: 56,
        borderColor: '#e6e9ef',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 text-xs transition-colors',
              active ? 'text-teal-700 font-semibold' : 'text-gray-400',
            )}
            style={active ? { color: '#00897b' } : {}}
          >
            <Icon size={22} />
            <span className="text-[10px]">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
