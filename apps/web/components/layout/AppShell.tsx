'use client';

import { useState } from 'react';
import { TopNav } from './TopNav';
import { Sidebar } from './Sidebar';
import { BottomTabBar } from './BottomTabBar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="h-full">
      <TopNav onMenuClick={() => setSidebarCollapsed((c) => !c)} />

      {/* Desktop/Tablet sidebar */}
      <div className="hidden md:block">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((c) => !c)} />
      </div>

      {/* Main content — CSS-only margin (no window.innerWidth) */}
      <main
        className={[
          'transition-[margin-left] duration-200 ease-in-out',
          'pb-16 md:pb-0',
          sidebarCollapsed ? 'md:ml-14' : 'md:ml-60',
        ].join(' ')}
        style={{ marginTop: 52, minHeight: 'calc(100vh - 52px)' }}
      >
        <div className="animate-fade-in">
          {children}
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <BottomTabBar />
    </div>
  );
}
