import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FilterNotificationsQueryDto } from './dto/filter-notifications-query.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: FilterNotificationsQueryDto, userId: string) {
    const { page, pageSize } = query;
    const where: Prisma.NotificationWhereInput = {};

    if (query.resolved === false) where.resolvedAt = null;
    if (query.resolved === true) where.resolvedAt = { not: null };

    if (query.read === false) {
      where.reads = { none: { userId } };
    }
    if (query.read === true) {
      where.reads = { some: { userId } };
    }

    const [notifications, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          reads: { where: { userId }, select: { readAt: true } },
          relatedEquipment: { select: { id: true, name: true } },
        },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        message: n.message,
        relatedEquipmentId: n.relatedEquipmentId,
        relatedEquipmentName: n.relatedEquipment?.name ?? null,
        relatedLoanId: n.relatedLoanId,
        relatedReservationId: n.relatedReservationId,
        relatedDemoVisitId: n.relatedDemoVisitId,
        resolvedAt: n.resolvedAt?.toISOString() ?? null,
        createdAt: n.createdAt.toISOString(),
        isRead: n.reads.length > 0,
      })),
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: {
        resolvedAt: null,
        reads: { none: { userId } },
      },
    });
    return { data: { count } };
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification) throw new NotFoundException('Notification not found');

    await this.prisma.notificationRead.upsert({
      where: {
        notificationId_userId: { notificationId, userId },
      },
      create: { notificationId, userId },
      update: {},
    });

    return { data: { success: true } };
  }

  async markAllAsRead(userId: string) {
    const unread = await this.prisma.notification.findMany({
      where: {
        resolvedAt: null,
        reads: { none: { userId } },
      },
      select: { id: true },
    });

    if (unread.length > 0) {
      await this.prisma.notificationRead.createMany({
        data: unread.map((n) => ({ notificationId: n.id, userId })),
        skipDuplicates: true,
      });
    }

    return { data: { marked: unread.length } };
  }

  // ─── Lifecycle resolution methods ──────────────

  async resolveByLoan(loanId: string): Promise<void> {
    try {
      await this.prisma.notification.updateMany({
        where: { relatedLoanId: loanId, resolvedAt: null },
        data: { resolvedAt: new Date() },
      });
    } catch (error) {
      this.logger.warn(`Failed to resolve notifications for loan ${loanId}`, error);
    }
  }

  async resolveByReservation(reservationId: string): Promise<void> {
    try {
      await this.prisma.notification.updateMany({
        where: { relatedReservationId: reservationId, resolvedAt: null },
        data: { resolvedAt: new Date() },
      });
    } catch (error) {
      this.logger.warn(`Failed to resolve notifications for reservation ${reservationId}`, error);
    }
  }

  async resolveByDemoVisit(demoVisitId: string): Promise<void> {
    try {
      await this.prisma.notification.updateMany({
        where: { relatedDemoVisitId: demoVisitId, resolvedAt: null },
        data: { resolvedAt: new Date() },
      });
    } catch (error) {
      this.logger.warn(`Failed to resolve notifications for demo visit ${demoVisitId}`, error);
    }
  }

  async resolveByEquipment(equipmentId: string): Promise<void> {
    try {
      await this.prisma.notification.updateMany({
        where: { relatedEquipmentId: equipmentId, resolvedAt: null },
        data: { resolvedAt: new Date() },
      });
    } catch (error) {
      this.logger.warn(`Failed to resolve notifications for equipment ${equipmentId}`, error);
    }
  }
}
