import { Injectable } from '@nestjs/common';
import { AcquisitionType, OperationalStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

function toCsv(headers: string[], rows: (string | number | null)[][]): string {
  const escape = (v: unknown) =>
    `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [
    headers.join(','),
    ...rows.map((r) => r.map(escape).join(',')),
  ].join('\n');
}

function daysFrom(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / 86400000);
}

function formatDateGB(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Inventory ─────────────────────────────────

  async getInventory(filters: {
    status?: string[];
    acquisitionType?: string[];
    deviceCategory?: string[];
    isArchived?: boolean;
  }) {
    const where: Record<string, unknown> = {};
    if (filters.status?.length) where.status = { in: filters.status };
    if (filters.acquisitionType?.length)
      where.acquisitionType = { in: filters.acquisitionType };
    if (filters.deviceCategory?.length)
      where.deviceCategory = { in: filters.deviceCategory };
    where.isArchived = filters.isArchived ?? false;

    const items = await this.prisma.equipment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { donation: { select: { donorName: true } } },
    });

    const byStatus: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    for (const item of items) {
      byStatus[item.status] = (byStatus[item.status] ?? 0) + 1;
      byCategory[item.deviceCategory] =
        (byCategory[item.deviceCategory] ?? 0) + 1;
    }

    return {
      json: {
        generatedAt: new Date().toISOString(),
        totalItems: items.length,
        byStatus,
        byCategory,
        items: items.map((i) => ({
          id: i.id,
          name: i.name,
          make: i.make,
          model: i.model,
          serialNumber: i.serialNumber,
          deviceCategory: i.deviceCategory,
          acquisitionType: i.acquisitionType,
          status: i.status,
          condition: i.condition,
          acquiredAt: i.acquiredAt.toISOString(),
        })),
      },
      csv: toCsv(
        ['ID', 'Name', 'Make', 'Model', 'Serial Number', 'Category', 'Type', 'Status', 'Condition', 'Acquired'],
        items.map((i) => [
          i.id,
          i.name,
          i.make,
          i.model,
          i.serialNumber,
          i.deviceCategory,
          i.acquisitionType,
          i.status,
          i.condition,
          formatDateGB(i.acquiredAt),
        ]),
      ),
    };
  }

  // ─── Active Loans ──────────────────────────────

  async getActiveLoans() {
    const loans = await this.prisma.loan.findMany({
      where: { returnedAt: null, closedReason: null },
      orderBy: { loanedAt: 'desc' },
      include: {
        equipment: { select: { id: true, name: true } },
        client: { select: { id: true, displayName: true, charitylogId: true } },
      },
    });

    return {
      json: {
        generatedAt: new Date().toISOString(),
        total: loans.length,
        loans: loans.map((l) => ({
          id: l.id,
          equipmentId: l.equipmentId,
          equipmentName: l.equipment.name,
          clientName: l.client.displayName,
          charitylogId: l.client.charitylogId,
          loanedAt: l.loanedAt.toISOString(),
          expectedReturn: l.expectedReturn?.toISOString() ?? null,
          daysOnLoan: daysFrom(l.loanedAt),
        })),
      },
      csv: toCsv(
        ['Equipment ID', 'Equipment Name', 'Client', 'CharityLog ID', 'Loaned', 'Expected Return', 'Days On Loan'],
        loans.map((l) => [
          l.equipmentId,
          l.equipment.name,
          l.client.displayName,
          l.client.charitylogId,
          formatDateGB(l.loanedAt),
          l.expectedReturn ? formatDateGB(l.expectedReturn) : '',
          daysFrom(l.loanedAt),
        ]),
      ),
    };
  }

  // ─── Overdue Loans ─────────────────────────────

  async getOverdueLoans() {
    const now = new Date();
    const loans = await this.prisma.loan.findMany({
      where: {
        returnedAt: null,
        closedReason: null,
        expectedReturn: { not: null, lt: now },
      },
      orderBy: { expectedReturn: 'asc' },
      include: {
        equipment: { select: { id: true, name: true } },
        client: { select: { id: true, displayName: true, charitylogId: true } },
      },
    });

    return {
      json: {
        generatedAt: now.toISOString(),
        total: loans.length,
        loans: loans.map((l) => ({
          id: l.id,
          equipmentId: l.equipmentId,
          equipmentName: l.equipment.name,
          clientName: l.client.displayName,
          charitylogId: l.client.charitylogId,
          expectedReturn: l.expectedReturn!.toISOString(),
          daysOverdue: daysFrom(l.expectedReturn!),
        })),
      },
      csv: toCsv(
        ['Equipment ID', 'Equipment Name', 'Client', 'CharityLog ID', 'Expected Return', 'Days Overdue'],
        loans.map((l) => [
          l.equipmentId,
          l.equipment.name,
          l.client.displayName,
          l.client.charitylogId,
          formatDateGB(l.expectedReturn!),
          daysFrom(l.expectedReturn!),
        ]),
      ),
    };
  }

  // ─── Active Demo Visits ────────────────────────

  async getActiveDemoVisits() {
    const visits = await this.prisma.demoVisit.findMany({
      where: { returnedAt: null, closedReason: null },
      orderBy: { startedAt: 'desc' },
      include: {
        equipment: { select: { id: true, name: true } },
      },
    });

    return {
      json: {
        generatedAt: new Date().toISOString(),
        total: visits.length,
        visits: visits.map((v) => ({
          id: v.id,
          equipmentId: v.equipmentId,
          equipmentName: v.equipment.name,
          destination: v.destination,
          startedAt: v.startedAt.toISOString(),
          expectedReturn: v.expectedReturn?.toISOString() ?? null,
          daysActive: daysFrom(v.startedAt),
        })),
      },
      csv: toCsv(
        ['Equipment ID', 'Equipment Name', 'Destination', 'Started', 'Expected Return', 'Days Active'],
        visits.map((v) => [
          v.equipmentId,
          v.equipment.name,
          v.destination,
          formatDateGB(v.startedAt),
          v.expectedReturn ? formatDateGB(v.expectedReturn) : '',
          daysFrom(v.startedAt),
        ]),
      ),
    };
  }

  // ─── Allocations ───────────────────────────────

  async getAllocations() {
    const allocations = await this.prisma.allocation.findMany({
      orderBy: { allocatedAt: 'desc' },
      include: {
        equipment: { select: { id: true, name: true } },
        client: { select: { id: true, displayName: true, charitylogId: true } },
      },
    });

    return {
      json: {
        generatedAt: new Date().toISOString(),
        total: allocations.length,
        allocations: allocations.map((a) => ({
          id: a.id,
          equipmentId: a.equipmentId,
          equipmentName: a.equipment.name,
          clientName: a.client.displayName,
          charitylogId: a.client.charitylogId,
          allocatedAt: a.allocatedAt.toISOString(),
          originatingLoanId: a.originatingLoanId,
        })),
      },
      csv: toCsv(
        ['Equipment ID', 'Equipment Name', 'Client', 'CharityLog ID', 'Allocated', 'Originating Loan ID'],
        allocations.map((a) => [
          a.equipmentId,
          a.equipment.name,
          a.client.displayName,
          a.client.charitylogId,
          formatDateGB(a.allocatedAt),
          a.originatingLoanId,
        ]),
      ),
    };
  }

  // ─── Utilisation ───────────────────────────────

  async getUtilisation() {
    const groups = await this.prisma.equipment.groupBy({
      by: ['status'],
      where: {
        acquisitionType: AcquisitionType.DONATED_GIVEABLE,
        isArchived: false,
      },
      orderBy: { status: 'asc' },
      _count: { _all: true },
    });

    const counts: Record<string, number> = {};
    let total = 0;
    for (const g of groups) {
      counts[g.status] = g._count._all;
      total += g._count._all;
    }

    const onLoan = counts[OperationalStatus.ON_LOAN] ?? 0;
    const allocatedOut = counts[OperationalStatus.ALLOCATED_OUT] ?? 0;
    const utilisation = total > 0 ? Math.round(((onLoan + allocatedOut) / total) * 100) : 0;

    const data = {
      generatedAt: new Date().toISOString(),
      totalGiveable: total,
      availableForLoan: counts[OperationalStatus.AVAILABLE_FOR_LOAN] ?? 0,
      reserved: counts[OperationalStatus.RESERVED] ?? 0,
      onLoan,
      allocatedOut,
      decommissioned: counts[OperationalStatus.DECOMMISSIONED] ?? 0,
      utilisation,
    };

    return {
      json: data,
      csv: toCsv(
        ['Total Giveable', 'Available', 'Reserved', 'On Loan', 'Allocated', 'Decommissioned', 'Utilisation %'],
        [[data.totalGiveable, data.availableForLoan, data.reserved, data.onLoan, data.allocatedOut, data.decommissioned, data.utilisation]],
      ),
    };
  }
}
