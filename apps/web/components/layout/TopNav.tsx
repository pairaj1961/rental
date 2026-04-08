'use client';

import { Bell, Menu, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { initials } from '@/lib/utils';

interface TopNavProps {
  onMenuClick?: () => void;
}

export function TopNav({ onMenuClick }: TopNavProps) {
  const { user, logout } = useAuth();

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 text-white"
      style={{ backgroundColor: '#0f3d47', height: 52 }}
    >
      {/* Left: hamburger + logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-1.5 rounded hover:bg-white/10 transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold"
            style={{ backgroundColor: '#00897b' }}
          >
            TA
          </div>
          <span className="font-semibold text-sm hidden sm:block">Tools Act Rental</span>
        </div>
      </div>

      {/* Right: notifications + avatar */}
      <div className="flex items-center gap-2">
        <button className="p-1.5 rounded hover:bg-white/10 transition-colors relative" aria-label="Notifications">
          <Bell size={20} />
        </button>

        {user && (
          <div className="flex items-center gap-2 ml-1">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white cursor-pointer hover:opacity-80 transition-opacity"
              style={{ backgroundColor: '#00897b' }}
              title={`${user.firstName} ${user.lastName} (${user.role})`}
            >
              {initials(`${user.firstName} ${user.lastName}`)}
            </div>
            <div className="hidden md:block">
              <p className="text-xs font-medium leading-tight">{user.firstName} {user.lastName}</p>
              <p className="text-xs opacity-70 leading-tight capitalize">{user.role.replace(/_/g, ' ').toLowerCase()}</p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded hover:bg-white/10 transition-colors ml-1"
              aria-label="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
