import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsCronService {
  private readonly logger = new Logger(NotificationsCronService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(process.env.CRON_SCHEDULE || '0 6 * * *')
  async handleNotificationCron() {
    this.logger.log('Notification cron started');
    try {
      await this.autoResolve();
      await this.createOverdueNotifications();
      this.logger.log('Notification cron completed');
    } catch (error) {
      this.logger.error('Notification cron failed', error);
    }
  }

  private async autoResolve() {
    // Resolve LOAN_OVERDUE where loan is no longer active
    const resolvedLoans = await this.prisma.notification.updateMany({
      where: {
        type: NotificationType.LOAN_OVERDUE,
        resolvedAt: null,
        relatedLoan: {
          OR: [
            { returnedAt: { not: null } },
            { closedReason: { not: null } },
          ],
        },
      },
      data: { resolvedAt: new Date() },
    });

    // Resolve RESERVATION_EXPIRED where reservation is closed
    const resolvedReservations = await this.prisma.notification.updateMany({
      where: {
        type: NotificationType.RESERVATION_EXPIRED,
        resolvedAt: null,
        relatedReservation: { closedAt: { not: null } },
      },
      data: { resolvedAt: new Date() },
    });

    // Resolve DEMO_VISIT_OVERDUE where demo visit is returned
    const resolvedDemos = await this.prisma.notification.updateMany({
      where: {
        type: NotificationType.DEMO_VISIT_OVERDUE,
        resolvedAt: null,
        relatedDemoVisit: {
          OR: [
            { returnedAt: { not: null } },
            { closedReason: { not: null } },
          ],
        },
      },
      data: { resolvedAt: new Date() },
    });

    const total =
      resolvedLoans.count +
      resolvedReservations.count +
      resolvedDemos.count;

    if (total > 0) {
      this.logger.log(`Auto-resolved ${total} notifications`);
    }
  }

  private async createOverdueNotifications() {
    const now = new Date();
    let created = 0;

    // Overdue loans
    const overdueLoans = await this.prisma.loan.findMany({
      where: {
        returnedAt: null,
        closedReason: null,
        expectedReturn: { not: null, lt: now },
        notifications: {
          none: {
            type: NotificationType.LOAN_OVERDUE,
            resolvedAt: null,
          },
        },
      },
      include: {
        equipment: { select: { id: true, name: true } },
      },
    });

    if (overdueLoans.length > 0) {
      await this.prisma.notification.createMany({
        data: overdueLoans.map((loan) => ({
          type: NotificationType.LOAN_OVERDUE,
          message: `Loan overdue: ${loan.equipment.name} was expected back on ${loan.expectedReturn!.toLocaleDateString('en-GB')}`,
          relatedEquipmentId: loan.equipmentId,
          relatedLoanId: loan.id,
        })),
      });
      created += overdueLoans.length;
    }

    // Expired reservations
    const expiredReservations = await this.prisma.reservation.findMany({
      where: {
        closedAt: null,
        expiresAt: { not: null, lt: now },
        notifications: {
          none: {
            type: NotificationType.RESERVATION_EXPIRED,
            resolvedAt: null,
          },
        },
      },
      include: {
        equipment: { select: { id: true, name: true } },
      },
    });

    if (expiredReservations.length > 0) {
      await this.prisma.notification.createMany({
        data: expiredReservations.map((res) => ({
          type: NotificationType.RESERVATION_EXPIRED,
          message: `Reservation expired: ${res.equipment.name} reservation expired on ${res.expiresAt!.toLocaleDateString('en-GB')}`,
          relatedEquipmentId: res.equipmentId,
          relatedReservationId: res.id,
        })),
      });
      created += expiredReservations.length;
    }

    // Overdue demo visits
    const overdueDemos = await this.prisma.demoVisit.findMany({
      where: {
        returnedAt: null,
        closedReason: null,
        expectedReturn: { not: null, lt: now },
        notifications: {
          none: {
            type: NotificationType.DEMO_VISIT_OVERDUE,
            resolvedAt: null,
          },
        },
      },
      include: {
        equipment: { select: { id: true, name: true } },
      },
    });

    if (overdueDemos.length > 0) {
      await this.prisma.notification.createMany({
        data: overdueDemos.map((demo) => ({
          type: NotificationType.DEMO_VISIT_OVERDUE,
          message: `Demo visit overdue: ${demo.equipment.name} was expected back on ${demo.expectedReturn!.toLocaleDateString('en-GB')}`,
          relatedEquipmentId: demo.equipmentId,
          relatedDemoVisitId: demo.id,
        })),
      });
      created += overdueDemos.length;
    }

    if (created > 0) {
      this.logger.log(`Created ${created} new notifications`);
    }
  }
}
