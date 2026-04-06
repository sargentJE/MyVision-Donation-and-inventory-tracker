import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  AcquisitionType,
  AuditEvent,
  OperationalStatus,
  Prisma,
  Reservation,
  ReservationCloseReason,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ConvertReservationDto } from './dto/convert-reservation.dto';
import { FilterReservationsQueryDto } from './dto/filter-reservations-query.dto';
import { ReservationSummary } from './reservations.types';

const CLIENT_SELECT = {
  id: true,
  charitylogId: true,
  displayName: true,
  isAnonymised: true,
} as const;

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll(query: FilterReservationsQueryDto) {
    const { page, pageSize } = query;
    const where: Prisma.ReservationWhereInput = {};
    if (query.equipmentId) where.equipmentId = query.equipmentId;
    if (query.clientId) where.clientId = query.clientId;
    if (query.active === true) where.closedAt = null;

    const [reservations, total] = await this.prisma.$transaction([
      this.prisma.reservation.findMany({
        where,
        orderBy: { reservedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { client: { select: CLIENT_SELECT } },
      }),
      this.prisma.reservation.count({ where }),
    ]);

    return {
      data: reservations.map((r) => this.toSummary(r)),
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findById(id: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        client: { select: CLIENT_SELECT },
        equipment: true,
        reservedBy: {
          select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
        },
        loan: { include: { client: { select: CLIENT_SELECT } } },
      },
    });
    if (!reservation) throw new NotFoundException('Reservation not found');
    return { data: reservation };
  }

  async create(
    dto: CreateReservationDto,
    actorId: string,
  ): Promise<ReservationSummary> {
    // Validate client exists
    const client = await this.prisma.client.findUnique({
      where: { id: dto.clientId },
    });
    if (!client) throw new NotFoundException('Client not found');

    const result = await this.prisma.$transaction(async (tx) => {
      // Re-read equipment inside tx for race protection
      const equipment = await tx.equipment.findUnique({
        where: { id: dto.equipmentId },
      });
      if (!equipment) throw new NotFoundException('Equipment not found');

      if (
        equipment.status !== OperationalStatus.AVAILABLE_FOR_LOAN ||
        equipment.acquisitionType !== AcquisitionType.DONATED_GIVEABLE
      ) {
        throw new UnprocessableEntityException({
          error: 'INVALID_TRANSITION',
          message: 'Item is not available for reservation',
          currentStatus: equipment.status,
          attemptedAction: 'reserve',
        });
      }

      const reservation = await tx.reservation.create({
        data: {
          equipmentId: dto.equipmentId,
          clientId: dto.clientId,
          reservedByUserId: actorId,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
          notes: dto.notes,
        },
        include: { client: { select: CLIENT_SELECT } },
      });

      await tx.equipment.update({
        where: { id: dto.equipmentId },
        data: { status: OperationalStatus.RESERVED },
      });

      await tx.auditEntry.create({
        data: {
          event: AuditEvent.RESERVED,
          equipmentId: dto.equipmentId,
          changedByUserId: actorId,
        },
      });

      return reservation;
    });

    return this.toSummary(result);
  }

  async cancel(id: string, actorId: string): Promise<ReservationSummary> {
    const result = await this.prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: { id },
        include: { client: { select: CLIENT_SELECT } },
      });
      if (!reservation) throw new NotFoundException('Reservation not found');

      if (reservation.closedAt) {
        throw new UnprocessableEntityException('Reservation is already closed');
      }

      const now = new Date();
      const updated = await tx.reservation.update({
        where: { id },
        data: { closedAt: now, closedReason: ReservationCloseReason.CANCELLED },
        include: { client: { select: CLIENT_SELECT } },
      });

      await tx.equipment.update({
        where: { id: reservation.equipmentId },
        data: { status: OperationalStatus.AVAILABLE_FOR_LOAN },
      });

      await tx.auditEntry.create({
        data: {
          event: AuditEvent.RESERVATION_CANCELLED,
          equipmentId: reservation.equipmentId,
          changedByUserId: actorId,
        },
      });

      return updated;
    });

    await this.notificationsService.resolveByReservation(id);

    return this.toSummary(result);
  }

  async convertToLoan(id: string, dto: ConvertReservationDto, actorId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: { id },
        include: { client: { select: CLIENT_SELECT } },
      });
      if (!reservation) throw new NotFoundException('Reservation not found');

      if (reservation.closedAt) {
        throw new UnprocessableEntityException('Reservation is already closed');
      }

      const now = new Date();

      // Close reservation
      await tx.reservation.update({
        where: { id },
        data: { closedAt: now, closedReason: ReservationCloseReason.CONVERTED_TO_LOAN },
      });

      // Create loan
      const loan = await tx.loan.create({
        data: {
          equipmentId: reservation.equipmentId,
          clientId: reservation.clientId,
          originatingReservationId: reservation.id,
          expectedReturn: dto.expectedReturn
            ? new Date(dto.expectedReturn)
            : undefined,
          conditionAtLoan: dto.conditionAtLoan,
          conditionAtLoanNotes: dto.conditionAtLoanNotes,
          notes: dto.notes,
        },
        include: {
          client: { select: CLIENT_SELECT },
          equipment: true,
          originatingReservation: {
            include: { client: { select: CLIENT_SELECT } },
          },
        },
      });

      // Update equipment status
      await tx.equipment.update({
        where: { id: reservation.equipmentId },
        data: { status: OperationalStatus.ON_LOAN },
      });

      // Audit: log the new loan (conversion is tracked via reservation.closedReason)
      await tx.auditEntry.create({
        data: {
          event: AuditEvent.LOAN_ISSUED,
          equipmentId: reservation.equipmentId,
          changedByUserId: actorId,
          note: 'Converted from reservation',
        },
      });

      return { data: loan };
    });

    await this.notificationsService.resolveByReservation(id);

    return result;
  }

  private toSummary(
    r: Reservation & { client: { id: string; charitylogId: string; displayName: string; isAnonymised: boolean } },
  ): ReservationSummary {
    return {
      id: r.id,
      equipmentId: r.equipmentId,
      clientId: r.clientId,
      client: r.client,
      reservedAt: r.reservedAt.toISOString(),
      expiresAt: r.expiresAt?.toISOString() ?? null,
      closedAt: r.closedAt?.toISOString() ?? null,
      closedReason: r.closedReason,
    };
  }
}
