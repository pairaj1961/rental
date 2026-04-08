'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useDashboard } from '@/hooks/useDashboard';
import { useAuth } from '@/providers/AuthProvider';
import { type UserRole } from '@/providers/AuthProvider';
import { formatRelativeTime, formatDate } from '@/lib/utils';
import {
  ClipboardList, Package, AlertTriangle, BarChart2,
  Wrench, Users, TrendingUp, Activity, ChevronRight,
  CheckCircle2, Clock, Zap, FileText, Truck, Receipt,
} from 'lucide-react';

interface OverviewStats {
  activeContracts: number;
  availableEquipment: number;
  overdueInvoices: { count: number; total: number };
  upcomingDeliveries: number;
  equipmentInMaintenance: number;
}

/* ── KPI Card ──────────────────────────────────────────────────────────── */
interface KpiCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;        // hex accent colour
  bg: string;           // hex bg colour
  href?: string;
  sublabel?: string;
}

function KpiCard({ label, value, icon, color, bg, href, sublabel }: KpiCardProps) {
  const inner = (
    <div
      className="card p-5 flex items-start gap-4 hover:shadow-md transition-shadow group"
      style={{ borderColor: '#e6e9ef' }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: bg }}
      >
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#676879' }}>
          {label}
        </p>
        <p className="text-3xl font-bold leading-none" style={{ color }}>
          {value}
        </p>
        {sublabel && (
          <p className="text-xs mt-1" style={{ color: '#676879' }}>{sublabel}</p>
        )}
      </div>
      {href && (
        <ChevronRight
          size={16}
          className="shrink-0 opacity-0 group-hover:opacity-50 transition-opacity mt-1"
          style={{ color }}
        />
      )}
    </div>
  );

  return href
    ? <Link href={href} className="block">{inner}</Link>
    : inner;
}

/* ── Skeleton ──────────────────────────────────────────────────────────── */
function SkeletonKpi() {
  return <div className="skeleton h-24 rounded-xl" />;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: '#676879' }}>
      {title}
    </h2>
  );
}

/* ── Equipment Status Strip ─────────────────────────────────────────────── */
const EQUIP_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  AVAILABLE:   { label: 'Available',   color: '#00897b', bg: '#e0f2f1' },
  RENTED:      { label: 'Rented',      color: '#1565c0', bg: '#e3f2fd' },
  MAINTENANCE: { label: 'Maintenance', color: '#e65100', bg: '#fff3e0' },
  RETIRED:     { label: 'Retired',     color: '#757575', bg: '#f5f5f5' },
};

/* ── Action Badge ────────────────────────────────────────────────────────── */
const ACTION_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  create: { label: 'Created', bg: '#e0f2f1', color: '#006b5e' },
  update: { label: 'Updated', bg: '#e3f2fd', color: '#1565c0' },
  delete: { label: 'Deleted', bg: '#fce4ec', color: '#c62828' },
};

/* ── Page ─────────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useDashboard();
  const role = user?.role as UserRole;

  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/overview', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setOverview(d as OverviewStats))
      .catch(() => setOverview(null))
      .finally(() => setOverviewLoading(false));
  }, []);

  /* greeting */
  const firstName = user?.firstName ?? 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  /* ── Loading skeleton ───────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-7">
          <div className="skeleton h-7 w-56 mb-2 rounded" />
          <div className="skeleton h-4 w-40 rounded" />
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => <SkeletonKpi key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="skeleton h-48 rounded-xl" />
          <div className="skeleton h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  /* ── Manager / Admin Dashboard ─────────────────────────────────────── */
  const renderManagerDashboard = () => (
    <>
      {/* KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <KpiCard
          label="Active Rentals"
          value={data?.kpis?.totalActiveRentals ?? 0}
          icon={<ClipboardList size={22} />}
          color="#00897b"
          bg="#e0f2f1"
          href="/rentals"
          sublabel="Currently rented out"
        />
        <KpiCard
          label="Overdue Returns"
          value={data?.kpis?.overdueReturns ?? 0}
          icon={<AlertTriangle size={22} />}
          color="#e44258"
          bg="#fce4ec"
          href="/rentals"
          sublabel="Past return date"
        />
        <KpiCard
          label="Utilization Rate"
          value={`${data?.kpis?.utilizationRate ?? 0}%`}
          icon={<TrendingUp size={22} />}
          color="#1565c0"
          bg="#e3f2fd"
          sublabel="Equipment in use"
        />
        <KpiCard
          label="Maintenance Issues"
          value={data?.kpis?.openMaintenanceIssues ?? 0}
          icon={<Wrench size={22} />}
          color="#e65100"
          bg="#fff3e0"
          sublabel="This month"
        />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Equipment status */}
        {data?.equipmentByStatus && (
          <div className="card p-5">
            <SectionHeader title="Equipment Status" />
            <div className="space-y-2">
              {Object.entries(data.equipmentByStatus).map(([status, count]) => {
                const cfg = EQUIP_STATUS_CONFIG[status] ?? { label: status, color: '#676879', bg: '#f5f6f8' };
                const total = Object.values(data.equipmentByStatus as Record<string, number>).reduce((a, b) => a + (b as number), 0);
                const pct = total > 0 ? Math.round(((count as number) / total) * 100) : 0;
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-1 text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: cfg.color }}
                        />
                        <span className="font-medium">{cfg.label}</span>
                      </div>
                      <span className="font-bold" style={{ color: cfg.color }}>{count as number}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#f0f0f0' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: cfg.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <Link
              href="/equipment"
              className="mt-4 flex items-center gap-1 text-xs font-medium"
              style={{ color: '#00897b' }}
            >
              View all equipment <ChevronRight size={13} />
            </Link>
          </div>
        )}

        {/* Recent activity */}
        {data?.recentAuditEvents?.length > 0 && (
          <div className="card p-5">
            <SectionHeader title="Recent Activity" />
            <div className="space-y-1">
              {data.recentAuditEvents.slice(0, 8).map((event: any) => {
                const cfg = ACTION_CONFIG[event.action] ?? { label: event.action, bg: '#f5f6f8', color: '#323338' };
                return (
                  <div
                    key={event.id}
                    className="flex items-center gap-3 py-2 border-b last:border-0"
                    style={{ borderColor: '#f0f0f0' }}
                  >
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                      style={{ backgroundColor: cfg.bg, color: cfg.color }}
                    >
                      {cfg.label}
                    </span>
                    <span className="text-sm flex-1 truncate font-medium">{event.entityType}</span>
                    <span className="text-xs shrink-0" style={{ color: '#676879' }}>
                      {formatRelativeTime(event.timestamp)}
                    </span>
                  </div>
                );
              })}
            </div>
            <Link
              href="/audit-logs"
              className="mt-3 flex items-center gap-1 text-xs font-medium"
              style={{ color: '#00897b' }}
            >
              View full audit log <ChevronRight size={13} />
            </Link>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="card p-5">
        <SectionHeader title="Quick Actions" />
        <div className="flex flex-wrap gap-3">
          {[
            { href: '/rentals/new',  icon: <ClipboardList size={15} />, label: 'New Rental' },
            { href: '/equipment',    icon: <Package size={15} />,        label: 'Equipment' },
            { href: '/customers',    icon: <Users size={15} />,          label: 'Customers' },
            { href: '/reports',      icon: <BarChart2 size={15} />,      label: 'Reports' },
          ].map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:shadow-sm transition-all"
              style={{ borderColor: '#e6e9ef', color: '#323338', backgroundColor: '#fafafa' }}
            >
              <span style={{ color: '#00897b' }}>{a.icon}</span>
              {a.label}
            </Link>
          ))}
        </div>
      </div>
    </>
  );

  /* ── Sales Dashboard ────────────────────────────────────────────────── */
  const renderSalesDashboard = () => (
    <>
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        <KpiCard
          label="My Active Rentals"
          value={data?.kpis?.myActiveRentals ?? 0}
          icon={<ClipboardList size={22} />}
          color="#00897b"
          bg="#e0f2f1"
          href="/rentals"
        />
        <KpiCard
          label="Expiring in 7 Days"
          value={data?.kpis?.expiringThisWeek ?? 0}
          icon={<Clock size={22} />}
          color="#e65100"
          bg="#fff3e0"
          href="/rentals"
        />
        <KpiCard
          label="Total Customers"
          value={data?.kpis?.totalCustomers ?? 0}
          icon={<Users size={22} />}
          color="#1565c0"
          bg="#e3f2fd"
          href="/customers"
        />
      </div>

      {data?.expiringRentals?.length > 0 && (
        <div className="card p-5">
          <SectionHeader title="Expiring Soon" />
          <div className="space-y-2">
            {data.expiringRentals.map((r: any) => (
              <Link
                key={r.id}
                href={`/rentals/${r.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <div>
                  <p className="font-semibold text-sm group-hover:text-teal-700 transition-colors">
                    {r.customer?.companyName}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#676879' }}>{r.equipment?.modelName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-orange-500">
                    {formatDate(r.rentalEndDate)}
                  </span>
                  <ChevronRight size={14} className="opacity-30 group-hover:opacity-60 transition-opacity" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );

  /* ── Service Dashboard ──────────────────────────────────────────────── */
  const renderServiceDashboard = () => (
    <>
      <div className="grid grid-cols-2 gap-4 mb-8">
        <KpiCard
          label="My Assignments"
          value={data?.kpis?.activeAssignments ?? 0}
          icon={<Activity size={22} />}
          color="#00897b"
          bg="#e0f2f1"
          href="/rentals"
        />
        <KpiCard
          label="Pending Inspections"
          value={data?.kpis?.pendingInspections ?? 0}
          icon={<CheckCircle2 size={22} />}
          color="#e65100"
          bg="#fff3e0"
          href="/rentals"
        />
      </div>

      {data?.todayDeliveries?.length > 0 && (
        <div className="card p-5">
          <SectionHeader title="My Assignments" />
          <div className="space-y-3">
            {data.todayDeliveries.map((r: any) => (
              <Link
                key={r.id}
                href={`/rentals/${r.id}`}
                className="flex items-start gap-3 p-3 rounded-lg border hover:border-teal-300 hover:bg-teal-50/30 transition-all group"
                style={{ borderColor: '#e6e9ef' }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: '#e0f2f1' }}
                >
                  <Zap size={16} style={{ color: '#00897b' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm group-hover:text-teal-700 transition-colors">
                    {r.equipment?.modelName}
                  </p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: '#676879' }}>{r.jobSite?.siteName}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#b4b7c3' }}>{r.jobSite?.siteAddress}</p>
                </div>
                <ChevronRight size={15} className="opacity-30 group-hover:opacity-60 transition-opacity mt-1" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );

  /* ── Overview section (all roles) ───────────────────────────────────── */
  const fmt = (n: number) => n.toLocaleString('th-TH');
  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(n);

  const renderOverview = () => (
    <div className="mb-8">
      <SectionHeader title="Overview" />
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
        {overviewLoading ? (
          [1, 2, 3, 4, 5].map((i) => <SkeletonKpi key={i} />)
        ) : (
          <>
            <KpiCard
              label="Active Contracts"
              value={fmt(overview?.activeContracts ?? 0)}
              icon={<FileText size={22} />}
              color="#00897b"
              bg="#e0f2f1"
              href="/contracts"
              sublabel="Currently active"
            />
            <KpiCard
              label="Available Equipment"
              value={fmt(overview?.availableEquipment ?? 0)}
              icon={<Package size={22} />}
              color="#1565c0"
              bg="#e3f2fd"
              href="/equipment"
              sublabel="Ready to rent"
            />
            <KpiCard
              label="Overdue Invoices"
              value={fmt(overview?.overdueInvoices.count ?? 0)}
              icon={<Receipt size={22} />}
              color="#e44258"
              bg="#fce4ec"
              href="/invoices"
              sublabel={overview ? fmtCurrency(overview.overdueInvoices.total) : '—'}
            />
            <KpiCard
              label="Upcoming Deliveries"
              value={fmt(overview?.upcomingDeliveries ?? 0)}
              icon={<Truck size={22} />}
              color="#e65100"
              bg="#fff3e0"
              href="/deliveries"
              sublabel="Next 7 days"
            />
            <KpiCard
              label="In Maintenance"
              value={fmt(overview?.equipmentInMaintenance ?? 0)}
              icon={<Wrench size={22} />}
              color="#f59e0b"
              bg="#fffbeb"
              href="/maintenance"
              sublabel="Equipment units"
            />
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Greeting */}
      <div className="mb-7">
        <h1 className="text-xl font-bold" style={{ color: '#323338' }}>
          {greeting}, {firstName} 👋
        </h1>
        <p className="text-sm mt-1" style={{ color: '#676879' }}>{dateLabel}</p>
      </div>

      {/* Overview cards — always shown */}
      {renderOverview()}

      {(['MANAGER','ADMIN','SYSTEM_ADMIN','SALES_MANAGER'] as UserRole[]).includes(role) && renderManagerDashboard()}
      {(['SALES','SALES_REP','REP'] as UserRole[]).includes(role) && renderSalesDashboard()}
      {(['SERVICE','PRODUCTION_MANAGER','PRODUCT_MANAGER'] as UserRole[]).includes(role) && renderServiceDashboard()}
    </div>
  );
}
