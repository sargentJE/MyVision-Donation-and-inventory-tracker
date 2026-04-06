'use client';

import { Button } from '@/components/ui/button';
import {
  Package,
  HandCoins,
  AlertTriangle,
  MapPin,
  Users,
  BarChart3,
  Download,
} from 'lucide-react';

const REPORTS = [
  {
    id: 'inventory',
    title: 'Full Inventory',
    description: 'All equipment items with status, condition, and acquisition details.',
    icon: Package,
    endpoint: '/api/reports/inventory',
  },
  {
    id: 'active-loans',
    title: 'Active Loans',
    description: 'Currently loaned items with client, dates, and days on loan.',
    icon: HandCoins,
    endpoint: '/api/reports/active-loans',
  },
  {
    id: 'overdue',
    title: 'Overdue Loans',
    description: 'Items past their expected return date with days overdue.',
    icon: AlertTriangle,
    endpoint: '/api/reports/overdue',
  },
  {
    id: 'demo-visits',
    title: 'Active Demo Visits',
    description: 'Equipment currently out on demo visits with destinations and dates.',
    icon: MapPin,
    endpoint: '/api/reports/demo-visits',
  },
  {
    id: 'allocations',
    title: 'Allocations',
    description: 'Permanently allocated equipment with client and originating loan details.',
    icon: Users,
    endpoint: '/api/reports/allocations',
  },
  {
    id: 'utilisation',
    title: 'Donated-Giveable Utilisation',
    description: 'Summary of donated-giveable stock usage: on loan, allocated, available.',
    icon: BarChart3,
    endpoint: '/api/reports/utilisation',
  },
];

function downloadCsv(endpoint: string, name: string) {
  const date = new Date().toISOString().split('T')[0];
  const a = document.createElement('a');
  a.href = `${endpoint}?format=csv`;
  a.download = `${name}-${date}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Export data for analysis and record-keeping.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((report) => (
          <div key={report.id} className="rounded-md border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <report.icon className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-medium">{report.title}</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              {report.description}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadCsv(report.endpoint, report.id)}
            >
              <Download className="mr-2 h-4 w-4" />
              Download CSV
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
