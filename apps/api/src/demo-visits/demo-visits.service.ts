import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  AuditEvent,
  DemoVisitCloseReason,
  OperationalStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateDemoVisitDto } from './dto/create-demo-visit.dto';
import { ReturnDemoVisitDto } from './dto/return-demo-visit.dto';
import { FilterDemoVisitsQueryDto } from './dto/filter-demo-visits-query.dto';

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  createdAt: true,
} as const;

@Injectable()
export class DemoVisitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll(query: FilterDemoVisitsQueryDto) {
    const { page, pageSize } = query;
    const where: Prisma.DemoVisitWhereInput = {};
    if (query.equipmentId) where.equipmentId = query.equipmentId;
    if (query.active === true) where.returnedAt = null;

    const [visits, total] = await this.prisma.$transaction([
      this.prisma.demoVisit.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          equipment: { select: { id: true, name: true, serialNumber: true } },
        },
      }),
      this.prisma.demoVisit.count({ where }),
    ]);

    return {
      data: visits.map((v) => ({
        id: v.id,
        equipmentId: v.equipmentId,
        equipmentName: (v as { equipment: { name: string } }).equipment.name,
        destination: v.destination,
        startedAt: v.startedAt.toISOString(),
        expectedReturn: v.expectedReturn?.toISOString() ?? null,
        returnedAt: v.returnedAt?.toISOString() ?? null,
        closedReason: v.closedReason,
        notes: v.notes,
      })),
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findById(id: string) {
    const visit = await this.prisma.demoVisit.findUnique({
      where: { id },
      include: {
        equipment: true,
        startedBy: { select: USER_SELECT },
        returnedBy: { select: USER_SELECT },
      },
    });
    if (!visit) throw new NotFoundException('Demo visit not found');
    return { data: visit };
  }

  async start(dto: CreateDemoVisitDto, actorId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const equipment = await tx.equipment.findUnique({
        where: { id: dto.equipmentId },
      });
      if (!equipment) throw new NotFoundException('Equipment not found');

      if (equipment.status !== OperationalStatus.AVAILABLE_FOR_DEMO) {
        throw new UnprocessableEntityException({
          error: 'INVALID_TRANSITION',
          message: 'Item is not available for demo visits',
          currentStatus: equipment.status,
          attemptedAction: 'start_demo_visit',
        });
      }

      const visit = await tx.demoVisit.create({
        data: {
          equipmentId: dto.equipmentId,
          startedByUserId: actorId,
          destination: dto.destination,
          expectedReturn: dto.expectedReturn
            ? new Date(dto.expectedReturn)
            : undefined,
          notes: dto.notes,
        },
        include: {
          equipment: true,
          startedBy: { select: USER_SELECT },
        },
      });

      await tx.equipment.update({
        where: { id: dto.equipmentId },
        data: { status: OperationalStatus.ON_DEMO_VISIT },
      });

      await tx.auditEntry.create({
        data: {
          event: AuditEvent.DEMO_VISIT_STARTED,
          equipmentId: dto.equipmentId,
          changedByUserId: actorId,
          note: dto.destination
            ? `Demo visit to: ${dto.destination}`
            : undefined,
        },
      });

      return visit;
    });

    return { data: result };
  }

  async returnVisit(id: string, dto: ReturnDemoVisitDto, actorId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const visit = await tx.demoVisit.findUnique({ where: { id } });
      if (!visit) throw new NotFoundException('Demo visit not found');

      if (visit.returnedAt || visit.closedReason) {
        throw new UnprocessableEntityException(
          'Demo visit has already been returned',
        );
      }

      const now = new Date();
      const updated = await tx.demoVisit.update({
        where: { id },
        data: {
          returnedAt: now,
          returnedByUserId: actorId,
          closedReason: DemoVisitCloseReason.RETURNED,
          conditionOnReturn: dto.conditionOnReturn,
          conditionOnReturnNotes: dto.conditionOnReturnNotes,
          notes: dto.notes
            ? `${visit.notes ? visit.notes + '\n' : ''}${dto.notes}`
            : undefined,
        },
        include: {
          equipment: true,
          startedBy: { select: USER_SELECT },
          returnedBy: { select: USER_SELECT },
        },
      });

      await tx.equipment.update({
        where: { id: visit.equipmentId },
        data: { status: OperationalStatus.AVAILABLE_FOR_DEMO },
      });

      await tx.auditEntry.create({
        data: {
          event: AuditEvent.DEMO_VISIT_RETURNED,
          equipmentId: visit.equipmentId,
          changedByUserId: actorId,
        },
      });

      return updated;
    });

    await this.notificationsService.resolveByDemoVisit(id);

    return { data: result };
  }
}
