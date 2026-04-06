'use client';

import Link from 'next/link';
import { useDashboard, type ActivityEntry } from '@/hooks/use-dashboard';
import { StockDistribution } from '@/components/dashboard/stock-distribution';
import { UtilisationGauge } from '@/components/dashboard/utilisation-gauge';
import { CategoryBreakdown } from '@/components/dashboard/category-breakdown';
import { timeAgo } from '@/lib/date-utils';
import {
  HandCoins,
  AlertTriangle,
  MapPin,
  Tag,
} from 'lucide-react';

export default function DashboardPage() {
  const { data, isLoading } = useDashboard();
  const dashboard = data?.data;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div role="status" aria-label="Loading">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    );
  }

  if (!dashboard || dashboard.stockSummary.total === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="rounded-md border border-dashed p-8 text-center">
          <p className="text-lg font-medium">Get started</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add your first equipment item or import from CSV.
          </p>
          <Link
            href="/equipment/new"
            className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Add Equipment
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      {/* ROW 1: Key Metrics */}
      <section aria-labelledby="metrics-heading">
      <h2 id="metrics-heading" className="sr-only">Key Metrics</h2>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={AlertTriangle}
          label="Overdue Loans"
          value={dashboard.overdueLoans}
          href="/loans"
          variant={
            dashboard.overdueLoans > 3
              ? 'destructive'
              : dashboard.overdueLoans > 0
                ? 'warning'
                : 'default'
          }
        />
        <MetricCard
          icon={HandCoins}
          label="Active Loans"
          value={dashboard.activeLoans}
          href="/loans"
        />
        <MetricCard
          icon={MapPin}
          label="On Demo Visit"
          value={dashboard.activeDemoVisits}
        />
        <MetricCard
          icon={Tag}
          label="For Sale"
          value={dashboard.forSaleCount}
          href="/equipment"
        />
      </div>
      </section>

      {/* ROW 2: Stock Health */}
      <section aria-labelledby="charts-heading">
      <h2 id="charts-heading" className="sr-only">Charts</h2>
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <StockDistribution
            total={dashboard.stockSummary.total}
            byStatus={dashboard.stockSummary.byStatus}
          />
        </div>
        <div className="lg:col-span-2">
          <UtilisationGauge
            totalGiveable={dashboard.utilisationData.totalGiveable}
            inUse={dashboard.utilisationData.inUse}
            available={dashboard.utilisationData.available}
            utilisation={dashboard.utilisationData.utilisation}
          />
        </div>
      </div>

      </section>

      {/* ROW 3: Context */}
      <section aria-labelledby="activity-heading">
      <div className="grid gap-4 lg:grid-cols-2">
        <CategoryBreakdown byCategory={dashboard.byCategory} />

        <div className="rounded-md border p-4 space-y-3">
          <h2 id="activity-heading" className="text-sm font-medium text-muted-foreground">
            Recent Activity
          </h2>
          {dashboard.recentActivity.length > 0 ? (
            <div className="divide-y">
              {dashboard.recentActivity.map((entry: ActivityEntry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {entry.event.replace(/_/g, ' ')}
                    </span>
                    {entry.equipmentId && (
                      <Link
                        href={`/equipment/${entry.equipmentId}`}
                        className="text-sm text-primary hover:underline truncate"
                      >
                        {entry.equipmentName ?? 'View'}
                      </Link>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {entry.changedBy}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {timeAgo(entry.changedAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4">
              No recent activity.
            </p>
          )}
        </div>
      </div>
      </section>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  href,
  variant = 'default',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  href?: string;
  variant?: 'default' | 'warning' | 'destructive';
}) {
  const valueColour = {
    default: 'text-foreground',
    warning: 'text-amber-600',
    destructive: 'text-destructive',
  }[variant];

  const card = (
    <div className="rounded-md border p-4 transition-colors hover:bg-muted/30">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-sm">{label}</span>
      </div>
      <p className={`mt-1 text-3xl font-bold tracking-tight ${valueColour}`}>
        {value}
      </p>
    </div>
  );

  return href ? (
    <Link href={href} aria-label={`${label}: ${value}. View details.`}>
      {card}
    </Link>
  ) : card;
}
