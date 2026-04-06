import { Injectable } from '@nestjs/common';
import { AcquisitionType, OperationalStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getDashboard(userId: string) {
    const now = new Date();

    // Note: groupBy queries run outside $transaction because Prisma's batch
    // transaction syntax doesn't support groupBy. This means status/category/utilisation
    // counts are not atomic with the loan/demo counts below. For a dashboard summary
    // refreshing every 60s with 2-10 concurrent users, this race window is negligible.
    const equipment = await this.prisma.equipment.groupBy({
      by: ['status'],
      where: { isArchived: false },
      orderBy: { status: 'asc' },
      _count: { _all: true },
    });

    const [
      activeLoans,
      overdueLoans,
      activeDemoVisits,
      forSaleCount,
      recentActivity,
    ] = await this.prisma.$transaction([
      this.prisma.loan.count({
        where: { returnedAt: null, closedReason: null },
      }),
      this.prisma.loan.count({
        where: {
          returnedAt: null,
          closedReason: null,
          expectedReturn: { not: null, lt: now },
        },
      }),
      this.prisma.demoVisit.count({
        where: { returnedAt: null, closedReason: null },
      }),
      this.prisma.equipment.count({
        where: { isForSale: true, isArchived: false },
      }),
      this.prisma.auditEntry.findMany({
        orderBy: { changedAt: 'desc' },
        take: 5,
        include: {
          changedBy: { select: { id: true, name: true } },
          equipment: { select: { id: true, name: true } },
        },
      }),
    ]);

    // Build status breakdown
    const byStatus: Record<string, number> = {};
    let total = 0;
    for (const group of equipment) {
      byStatus[group.status] = group._count._all;
      total += group._count._all;
    }

    // Category breakdown
    const categoryGroups = await this.prisma.equipment.groupBy({
      by: ['deviceCategory'],
      where: { isArchived: false },
      orderBy: { deviceCategory: 'asc' },
      _count: { _all: true },
    });

    const byCategory: Record<string, number> = {};
    for (const g of categoryGroups) {
      byCategory[g.deviceCategory] = g._count._all;
    }

    // Loanable utilisation (DONATED_GIVEABLE only)
    const giveableGroups = await this.prisma.equipment.groupBy({
      by: ['status'],
      where: {
        acquisitionType: AcquisitionType.DONATED_GIVEABLE,
        isArchived: false,
      },
      orderBy: { status: 'asc' },
      _count: { _all: true },
    });

    const giveableCounts: Record<string, number> = {};
    let totalGiveable = 0;
    for (const g of giveableGroups) {
      giveableCounts[g.status] = g._count._all;
      totalGiveable += g._count._all;
    }

    const inUse =
      (giveableCounts[OperationalStatus.ON_LOAN] ?? 0) +
      (giveableCounts[OperationalStatus.ALLOCATED_OUT] ?? 0);
    const available =
      (giveableCounts[OperationalStatus.AVAILABLE_FOR_LOAN] ?? 0) +
      (giveableCounts[OperationalStatus.RESERVED] ?? 0);
    const utilisation =
      totalGiveable > 0 ? Math.round((inUse / totalGiveable) * 100) : 0;

    // Unread notification count (user-scoped)
    const notificationResult =
      await this.notificationsService.getUnreadCount(userId);

    return {
      data: {
        stockSummary: { total, byStatus },
        activeLoans,
        overdueLoans,
        activeDemoVisits,
        forSaleCount,
        unreadNotifications: notificationResult.data.count,
        byCategory,
        utilisationData: {
          totalGiveable,
          inUse,
          available,
          utilisation,
        },
        recentActivity: recentActivity.map((a) => ({
          id: a.id,
          event: a.event,
          equipmentId: a.equipmentId,
          equipmentName: a.equipment?.name ?? null,
          changedBy: a.changedBy.name,
          changedAt: a.changedAt.toISOString(),
          note: a.note,
        })),
      },
    };
  }
}
