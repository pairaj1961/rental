'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Package, BarChart2, ChevronLeft, ChevronRight,
  FileText, Wrench, Truck, Receipt, Settings, ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth, type UserRole } from '@/providers/AuthProvider';

const PM_SA: UserRole[] = ['PRODUCTION_MANAGER', 'PRODUCT_MANAGER', 'SYSTEM_ADMIN', 'ADMIN'];
const SM_SA: UserRole[] = ['SALES_MANAGER', 'MANAGER', 'SYSTEM_ADMIN', 'ADMIN'];
const SA:    UserRole[] = ['SYSTEM_ADMIN', 'ADMIN'];

interface NavItem {
  href: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string;
  roles?: UserRole[];
  external?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/contracts',  icon: FileText,        label: 'Contracts' },
  { href: '/equipment',  icon: Package,         label: 'Equipment',        roles: PM_SA },
  { href: '/maintenance',icon: Wrench,          label: 'Maintenance',      roles: PM_SA },
  { href: '/deliveries', icon: Truck,           label: 'Delivery Schedule',roles: PM_SA },
  { href: '/invoices',   icon: Receipt,         label: 'Invoices',         roles: SM_SA },
  { href: '/reports',    icon: BarChart2,       label: 'Reports',          roles: SM_SA },
  { href: '/settings',   icon: Settings,        label: 'Settings',         roles: SA },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const isAdmin = user?.role === 'SYSTEM_ADMIN' || user?.role === 'ADMIN';

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.roles) return true;
    return user && item.roles.includes(user.role as UserRole);
  });

  const navLinkClass = (active: boolean) => cn(
    'flex items-center gap-3 mx-2 rounded-lg transition-all duration-150 text-sm group',
    collapsed ? 'px-0 py-2.5 justify-center' : 'px-3 py-2.5',
    active
      ? 'font-semibold'
      : 'text-gray-500 hover:text-gray-800 hover:bg-white/60',
  );

  const activeStyle = {
    backgroundColor: '#e0f2f1',
    color: '#006b5e',
    boxShadow: '0 1px 3px rgba(0,137,123,0.10)',
  };

  return (
    <aside
      className="fixed left-0 bottom-0 flex flex-col border-r transition-all duration-200 z-40"
      style={{
        top: 52,
        width: collapsed ? 56 : 240,
        backgroundColor: '#f5f6f8',
        borderColor: '#e6e9ef',
      }}
    >
      {/* Nav items */}
      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={navLinkClass(active)}
              style={active ? activeStyle : {}}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 2} />
              {!collapsed && <span className="truncate leading-none">{item.label}</span>}
            </Link>
          );
        })}

        {/* xCRM external link — SYSTEM_ADMIN only */}
        {isAdmin && (
          <>
            <div className="mx-3 my-2 border-t" style={{ borderColor: '#e6e9ef' }} />
            <a
              href="http://localhost:3000"
              target="_blank"
              rel="noopener noreferrer"
              title={collapsed ? 'xCRM' : undefined}
              className={navLinkClass(false)}
            >
              <ExternalLink size={18} strokeWidth={2} />
              {!collapsed && <span className="truncate leading-none">xCRM</span>}
            </a>
          </>
        )}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t p-2" style={{ borderColor: '#e6e9ef' }}>
        <button
          onClick={onToggle}
          className={cn(
            'flex items-center justify-center w-full py-2 rounded-lg hover:bg-white/60 transition-colors text-gray-400 hover:text-gray-600',
            collapsed ? '' : 'gap-1.5',
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed
            ? <ChevronRight size={16} />
            : <>
                <ChevronLeft size={16} />
                <span className="text-xs font-medium">Collapse</span>
              </>
          }
        </button>
      </div>
    </aside>
  );
}
