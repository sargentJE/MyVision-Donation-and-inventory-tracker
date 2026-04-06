import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  AuditEvent,
  Equipment,
  OperationalStatus,
  Prisma,
  Role,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TransitionService } from './transition.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { DecommissionDto } from './dto/decommission.dto';
import { ArchiveDto } from './dto/archive.dto';
import { RestoreDto } from './dto/restore.dto';
import { ReclassifyDto } from './dto/reclassify.dto';
import { FilterEquipmentQueryDto } from './dto/filter-equipment-query.dto';
import {
  CurrentActivity,
  DonationSummary,
  EquipmentDetail,
  EquipmentSummary,
} from './equipment.types';

const ADMIN_ONLY_FIELDS = new Set([
  'serialNumber',
  'purchasePrice',
  'supplier',
  'warrantyExpiry',
]);

interface Donation {
  id: string;
  donorName: string;
  donorOrg: string | null;
  donatedAt: Date;
}

@Injectable()
export class EquipmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly transitionService: TransitionService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ─── CRUD ──────────────────────────────────────────

  async findAll(query: FilterEquipmentQueryDto) {
    const where = this.buildWhereClause(query);
    const { page, pageSize } = query;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.equipment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.equipment.count({ where }),
    ]);

    return {
      data: items.map((e) => this.toSummary(e)),
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findById(id: string): Promise<EquipmentDetail> {
    const equipment = await this.prisma.equipment.findUnique({
      where: { id },
      include: { donation: true },
    });
    if (!equipment) throw new NotFoundException('Equipment not found');

    return this.toDetail(equipment);
  }

  async create(
    dto: CreateEquipmentDto,
    actorId: string,
  ): Promise<EquipmentDetail> {
    const status = this.transitionService.getInitialStatus(dto.acquisitionType);

    // Resolve donation
    let donationId: string | undefined = undefined;
    const isDonated =
      dto.acquisitionType === 'DONATED_DEMO' ||
      dto.acquisitionType === 'DONATED_GIVEABLE';

    if (isDonated) {
      if (dto.donationId) {
        const exists = await this.prisma.donation.findUnique({
          where: { id: dto.donationId },
        });
        if (!exists) throw new NotFoundException('Donation not found');
        donationId = dto.donationId;
      } else if (dto.donorName) {
        const donation = await this.prisma.donation.create({
          data: {
            donorName: dto.donorName,
            donorOrg: dto.donorOrg,
            donatedAt: dto.donatedAt
              ? new Date(dto.donatedAt)
              : new Date(dto.acquiredAt),
          },
        });
        donationId = donation.id;
      }

      if (!donationId) {
        throw new BadRequestException(
          'Donated items require either donationId or donorName',
        );
      }
    }

    let equipment: Equipment & { donation: Donation | null };
    try {
      equipment = await this.prisma.equipment.create({
        data: {
          name: dto.name,
          deviceCategory: dto.deviceCategory,
          acquisitionType: dto.acquisitionType,
          status,
          condition: dto.condition,
          acquiredAt: new Date(dto.acquiredAt),
          make: dto.make,
          model: dto.model,
          serialNumber: dto.serialNumber,
          conditionNotes: dto.conditionNotes,
          notes: dto.notes,
          purchasePrice: dto.purchasePrice
            ? new Prisma.Decimal(dto.purchasePrice)
            : undefined,
          supplier: isDonated ? undefined : dto.supplier,
          warrantyExpiry: dto.warrantyExpiry
            ? new Date(dto.warrantyExpiry)
            : undefined,
          donationId,
        },
        include: { donation: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Serial number already exists');
      }
      throw error;
    }

    await this.auditService.log({
      event: AuditEvent.ITEM_CREATED,
      equipmentId: equipment.id,
      changedByUserId: actorId,
    });

    return this.toDetail(equipment);
  }

  async update(
    id: string,
    dto: UpdateEquipmentDto,
    actor: { id: string; role: string },
  ): Promise<EquipmentDetail> {
    // Check admin-only field access
    if (actor.role !== Role.ADMIN) {
      const attempted = Object.keys(dto).filter(
        (k) => ADMIN_ONLY_FIELDS.has(k) && dto[k as keyof UpdateEquipmentDto] !== undefined,
      );
      if (attempted.length > 0) {
        throw new ForbiddenException(
          `Insufficient permissions to edit: ${attempted.join(', ')}`,
        );
      }
    }

    const current = await this.prisma.equipment.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Equipment not found');

    // Decommissioned items: Staff cannot edit at all, Admin can only edit notes
    if (current.status === OperationalStatus.DECOMMISSIONED) {
      if (actor.role !== Role.ADMIN) {
        throw new ForbiddenException('Cannot edit decommissioned equipment');
      }
      const nonNotesFields = Object.keys(dto).filter(
        (k) => k !== 'notes' && dto[k as keyof UpdateEquipmentDto] !== undefined,
      );
      if (nonNotesFields.length > 0) {
        throw new ForbiddenException(
          'Only notes can be edited on decommissioned equipment',
        );
      }
    }

    // Build update data and compute diff
    const updateData: Record<string, unknown> = {};
    const changes: Array<{
      field: string;
      oldValue: string | null;
      newValue: string | null;
    }> = [];

    const fieldEntries: Array<[string, unknown]> = [
      ['name', dto.name],
      ['make', dto.make],
      ['model', dto.model],
      ['condition', dto.condition],
      ['conditionNotes', dto.conditionNotes],
      ['notes', dto.notes],
      ['serialNumber', dto.serialNumber],
      ['supplier', dto.supplier],
      [
        'warrantyExpiry',
        dto.warrantyExpiry ? new Date(dto.warrantyExpiry) : undefined,
      ],
      [
        'purchasePrice',
        dto.purchasePrice ? new Prisma.Decimal(dto.purchasePrice) : undefined,
      ],
    ];

    for (const [field, newVal] of fieldEntries) {
      if (newVal === undefined) continue;
      const oldVal = (current as Record<string, unknown>)[field];
      const oldStr = oldVal?.toString() ?? null;
      const newStr = newVal?.toString() ?? null;
      if (oldStr !== newStr) {
        changes.push({ field, oldValue: oldStr, newValue: newStr });
        updateData[field] = newVal;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return this.toDetail(current as Equipment & { donation: null });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      let result: Equipment & { donation: Donation | null };
      try {
        result = await tx.equipment.update({
          where: { id },
          data: updateData,
          include: { donation: true },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new ConflictException('Serial number already exists');
        }
        throw error;
      }

      for (const change of changes) {
        await tx.auditEntry.create({
          data: {
            event: AuditEvent.ITEM_EDITED,
            equipmentId: id,
            changedByUserId: actor.id,
            field: change.field,
            oldValue: change.oldValue,
            newValue: change.newValue,
          },
        });
      }

      return result;
    });

    return this.toDetail(updated);
  }

  // ─── STATE OPERATIONS ──────────────────────────────

  async decommission(
    id: string,
    dto: DecommissionDto,
    actorId: string,
  ): Promise<EquipmentDetail> {
    const equipment = await this.prisma.equipment.findUnique({
      where: { id },
    });
    if (!equipment) throw new NotFoundException('Equipment not found');

    if (!this.transitionService.canDecommission(equipment.status)) {
      throw new UnprocessableEntityException('Equipment is already decommissioned');
    }

    // Find active dependents
    const [activeReservation, activeLoan, activeDemoVisit] =
      await Promise.all([
        this.prisma.reservation.findFirst({
          where: { equipmentId: id, closedAt: null },
          include: { client: true },
        }),
        this.prisma.loan.findFirst({
          where: { equipmentId: id, returnedAt: null, closedReason: null },
          include: { client: true },
        }),
        this.prisma.demoVisit.findFirst({
          where: { equipmentId: id, returnedAt: null },
        }),
      ]);

    const hasConflicts = activeReservation || activeLoan || activeDemoVisit;

    if (hasConflicts && !dto.forceClose) {
      const conflicts: Record<string, unknown> = {};
      if (activeReservation) {
        conflicts.activeReservation = {
          id: activeReservation.id,
          client: {
            id: activeReservation.client.id,
            charitylogId: activeReservation.client.charitylogId,
            displayName: activeReservation.client.displayName,
          },
          reservedAt: activeReservation.reservedAt.toISOString(),
        };
      }
      if (activeLoan) {
        conflicts.activeLoan = {
          id: activeLoan.id,
          client: {
            id: activeLoan.client.id,
            charitylogId: activeLoan.client.charitylogId,
            displayName: activeLoan.client.displayName,
          },
          loanedAt: activeLoan.loanedAt.toISOString(),
        };
      }
      if (activeDemoVisit) {
        conflicts.activeDemoVisit = {
          id: activeDemoVisit.id,
          startedAt: activeDemoVisit.startedAt.toISOString(),
          destination: activeDemoVisit.destination,
        };
      }

      throw new ConflictException({
        error: 'ACTIVE_DEPENDENTS',
        message:
          'Item has active dependents. Set forceClose to true to proceed.',
        conflicts,
      });
    }

    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      // Close active dependents
      if (activeReservation) {
        await tx.reservation.update({
          where: { id: activeReservation.id },
          data: { closedAt: now, closedReason: 'DECOMMISSIONED' },
        });
        await tx.auditEntry.create({
          data: {
            event: AuditEvent.RESERVATION_CANCELLED,
            equipmentId: id,
            changedByUserId: actorId,
            note: 'Auto-closed: equipment decommissioned',
          },
        });
      }
      if (activeLoan) {
        await tx.loan.update({
          where: { id: activeLoan.id },
          data: {
            returnedAt: now,
            closedReason: 'DECOMMISSIONED',
            closedByUserId: actorId,
          },
        });
        await tx.auditEntry.create({
          data: {
            event: AuditEvent.LOAN_RETURNED,
            equipmentId: id,
            changedByUserId: actorId,
            note: 'Auto-closed: equipment decommissioned',
          },
        });
      }
      if (activeDemoVisit) {
        await tx.demoVisit.update({
          where: { id: activeDemoVisit.id },
          data: {
            returnedAt: now,
            closedReason: 'DECOMMISSIONED',
            returnedByUserId: actorId,
          },
        });
        await tx.auditEntry.create({
          data: {
            event: AuditEvent.DEMO_VISIT_RETURNED,
            equipmentId: id,
            changedByUserId: actorId,
            note: 'Auto-closed: equipment decommissioned',
          },
        });
      }

      // Decommission the equipment + log audit — all in same transaction
      const result = await tx.equipment.update({
        where: { id },
        data: {
          status: OperationalStatus.DECOMMISSIONED,
          decommissionedAt: now,
          decommissionedByUserId: actorId,
          decommissionReason: dto.reason,
        },
        include: { donation: true },
      });

      await tx.auditEntry.create({
        data: {
          event: AuditEvent.DECOMMISSIONED,
          equipmentId: id,
          changedByUserId: actorId,
          note: dto.reason,
        },
      });

      return result;
    });

    await this.notificationsService.resolveByEquipment(id);

    return this.toDetail(updated);
  }

  async archive(
    id: string,
    dto: ArchiveDto,
    actorId: string,
  ): Promise<EquipmentDetail> {
    try {
      const updated = await this.prisma.equipment.update({
        where: { id },
        data: {
          isArchived: true,
          archivedAt: new Date(),
          archivedByUserId: actorId,
          archiveReason: dto.reason,
        },
        include: { donation: true },
      });

      await this.auditService.log({
        event: AuditEvent.ARCHIVED,
        equipmentId: id,
        changedByUserId: actorId,
        note: dto.reason,
      });

      return this.toDetail(updated);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Equipment not found');
      }
      throw error;
    }
  }

  async restore(
    id: string,
    dto: RestoreDto,
    actorId: string,
  ): Promise<EquipmentDetail> {
    try {
      const updated = await this.prisma.equipment.update({
        where: { id },
        data: {
          isArchived: false,
          archivedAt: null,
          archivedByUserId: null,
          archiveReason: null,
        },
        include: { donation: true },
      });

      await this.auditService.log({
        event: AuditEvent.ARCHIVE_RESTORED,
        equipmentId: id,
        changedByUserId: actorId,
        note: dto.reason,
      });

      return this.toDetail(updated);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Equipment not found');
      }
      throw error;
    }
  }

  async flagForSale(id: string, actorId: string): Promise<EquipmentDetail> {
    const equipment = await this.prisma.equipment.findUnique({
      where: { id },
    });
    if (!equipment) throw new NotFoundException('Equipment not found');

    const check = this.transitionService.canFlagForSale(
      equipment.acquisitionType,
      equipment.status,
    );
    if (!check.allowed) {
      throw new UnprocessableEntityException(check.reason);
    }

    const updated = await this.prisma.equipment.update({
      where: { id },
      data: { isForSale: true },
      include: { donation: true },
    });

    await this.auditService.log({
      event: AuditEvent.SALE_FLAGGED,
      equipmentId: id,
      changedByUserId: actorId,
    });

    return this.toDetail(updated);
  }

  async unflagForSale(id: string, actorId: string): Promise<EquipmentDetail> {
    try {
      const updated = await this.prisma.equipment.update({
        where: { id },
        data: { isForSale: false },
        include: { donation: true },
      });

      await this.auditService.log({
        event: AuditEvent.SALE_FLAG_REMOVED,
        equipmentId: id,
        changedByUserId: actorId,
      });

      return this.toDetail(updated);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Equipment not found');
      }
      throw error;
    }
  }

  async reclassify(
    id: string,
    dto: ReclassifyDto,
    actorId: string,
  ): Promise<EquipmentDetail> {
    const equipment = await this.prisma.equipment.findUnique({
      where: { id },
    });
    if (!equipment) throw new NotFoundException('Equipment not found');

    const result = this.transitionService.validateReclassification(
      equipment.status,
      dto.acquisitionType,
    );

    if (!result.allowed) {
      throw new UnprocessableEntityException({
        error: 'INVALID_TRANSITION',
        message: result.blockReason,
        currentStatus: equipment.status,
        attemptedAction: `reclassify to ${dto.acquisitionType}`,
      });
    }

    const updateData: Prisma.EquipmentUpdateInput = {
      acquisitionType: dto.acquisitionType,
    };

    if (result.autoTransitionTo) {
      updateData.status = result.autoTransitionTo;
    }

    const updated = await this.prisma.equipment.update({
      where: { id },
      data: updateData,
      include: { donation: true },
    });

    await this.auditService.log({
      event: AuditEvent.ACQUISITION_RECLASSIFIED,
      equipmentId: id,
      changedByUserId: actorId,
      field: 'acquisitionType',
      oldValue: equipment.acquisitionType,
      newValue: dto.acquisitionType,
      note: dto.reason,
    });

    return this.toDetail(updated);
  }

  async getAuditLog(equipmentId: string, page: number, pageSize: number) {
    // Verify equipment exists
    const exists = await this.prisma.equipment.findUnique({
      where: { id: equipmentId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Equipment not found');

    return this.auditService.findByEquipment(equipmentId, page, pageSize);
  }

  // ─── PRIVATE HELPERS ───────────────────────────────

  private async resolveCurrentActivity(
    equipment: Equipment,
  ): Promise<CurrentActivity> {
    const clientSelect = {
      id: true,
      charitylogId: true,
      displayName: true,
    };

    switch (equipment.status) {
      case OperationalStatus.RESERVED: {
        const reservation = await this.prisma.reservation.findFirst({
          where: { equipmentId: equipment.id, closedAt: null },
          include: { client: { select: clientSelect } },
        });
        if (!reservation) return null;
        return {
          type: 'reservation',
          data: {
            id: reservation.id,
            client: reservation.client,
            reservedAt: reservation.reservedAt.toISOString(),
            expiresAt: reservation.expiresAt?.toISOString() ?? null,
            notes: reservation.notes,
          },
        };
      }
      case OperationalStatus.ON_LOAN: {
        const loan = await this.prisma.loan.findFirst({
          where: {
            equipmentId: equipment.id,
            returnedAt: null,
            closedReason: null,
          },
          include: { client: { select: clientSelect } },
        });
        if (!loan) return null;
        return {
          type: 'loan',
          data: {
            id: loan.id,
            client: loan.client,
            loanedAt: loan.loanedAt.toISOString(),
            expectedReturn: loan.expectedReturn?.toISOString() ?? null,
            notes: loan.notes,
          },
        };
      }
      case OperationalStatus.ALLOCATED_OUT: {
        const allocation = await this.prisma.allocation.findUnique({
          where: { equipmentId: equipment.id },
          include: { client: { select: clientSelect } },
        });
        if (!allocation) return null;
        return {
          type: 'allocation',
          data: {
            id: allocation.id,
            client: allocation.client,
            allocatedAt: allocation.allocatedAt.toISOString(),
            originatingLoanId: allocation.originatingLoanId,
            notes: allocation.notes,
          },
        };
      }
      case OperationalStatus.ON_DEMO_VISIT: {
        const demoVisit = await this.prisma.demoVisit.findFirst({
          where: { equipmentId: equipment.id, returnedAt: null },
        });
        if (!demoVisit) return null;
        return {
          type: 'demoVisit',
          data: {
            id: demoVisit.id,
            equipmentId: demoVisit.equipmentId,
            destination: demoVisit.destination,
            startedAt: demoVisit.startedAt.toISOString(),
            expectedReturn: demoVisit.expectedReturn?.toISOString() ?? null,
            returnedAt: demoVisit.returnedAt?.toISOString() ?? null,
            closedReason: demoVisit.closedReason,
            notes: demoVisit.notes,
          },
        };
      }
      default:
        return null;
    }
  }

  private toSummary(e: Equipment): EquipmentSummary {
    return {
      id: e.id,
      name: e.name,
      make: e.make,
      model: e.model,
      serialNumber: e.serialNumber,
      deviceCategory: e.deviceCategory,
      acquisitionType: e.acquisitionType,
      status: e.status,
      condition: e.condition,
      isForSale: e.isForSale,
      isArchived: e.isArchived,
      acquiredAt: e.acquiredAt.toISOString(),
      createdAt: e.createdAt.toISOString(),
    };
  }

  private async toDetail(
    e: Equipment & { donation?: Donation | null },
  ): Promise<EquipmentDetail> {
    const currentActivity = await this.resolveCurrentActivity(e);

    let donation: DonationSummary | null = null;
    if (e.donation) {
      donation = {
        id: e.donation.id,
        donorName: e.donation.donorName,
        donorOrg: e.donation.donorOrg,
        donatedAt: e.donation.donatedAt.toISOString(),
      };
    }

    return {
      ...this.toSummary(e),
      conditionNotes: e.conditionNotes,
      notes: e.notes,
      purchasePrice: e.purchasePrice?.toString() ?? null,
      supplier: e.supplier,
      warrantyExpiry: e.warrantyExpiry?.toISOString() ?? null,
      decommissionedAt: e.decommissionedAt?.toISOString() ?? null,
      decommissionReason: e.decommissionReason,
      archivedAt: e.archivedAt?.toISOString() ?? null,
      archiveReason: e.archiveReason,
      donation,
      currentActivity,
    };
  }

  private buildWhereClause(
    query: FilterEquipmentQueryDto,
  ): Prisma.EquipmentWhereInput {
    const where: Prisma.EquipmentWhereInput = {};

    if (query.q?.trim()) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { make: { contains: query.q, mode: 'insensitive' } },
        { model: { contains: query.q, mode: 'insensitive' } },
        { serialNumber: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    if (query.status?.length) where.status = { in: query.status };
    if (query.acquisitionType?.length)
      where.acquisitionType = { in: query.acquisitionType };
    if (query.deviceCategory?.length)
      where.deviceCategory = { in: query.deviceCategory };

    // Default: non-archived only
    where.isArchived = query.isArchived ?? false;

    if (query.isForSale !== undefined) where.isForSale = query.isForSale;

    return where;
  }
}
