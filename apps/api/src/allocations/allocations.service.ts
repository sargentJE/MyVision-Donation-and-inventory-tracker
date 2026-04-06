import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  AcquisitionType,
  AuditEvent,
  OperationalStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAllocationDto } from './dto/create-allocation.dto';
import { FilterAllocationsQueryDto } from './dto/filter-allocations-query.dto';

const CLIENT_SELECT = {
  id: true,
  charitylogId: true,
  displayName: true,
  isAnonymised: true,
} as const;

@Injectable()
export class AllocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: FilterAllocationsQueryDto) {
    const { page, pageSize } = query;
    const where: Prisma.AllocationWhereInput = {};
    if (query.clientId) where.clientId = query.clientId;
    if (query.equipmentId) where.equipmentId = query.equipmentId;

    const [allocations, total] = await this.prisma.$transaction([
      this.prisma.allocation.findMany({
        where,
        orderBy: { allocatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          client: { select: CLIENT_SELECT },
          equipment: { select: { id: true, name: true, serialNumber: true } },
        },
      }),
      this.prisma.allocation.count({ where }),
    ]);

    return {
      data: allocations.map((a) => ({
        id: a.id,
        equipmentId: a.equipmentId,
        clientId: a.clientId,
        client: a.client,
        allocatedAt: a.allocatedAt.toISOString(),
        originatingLoanId: a.originatingLoanId,
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
    const allocation = await this.prisma.allocation.findUnique({
      where: { id },
      include: {
        client: { select: CLIENT_SELECT },
        equipment: true,
        allocatedBy: {
          select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
        },
        originatingLoan: {
          include: { client: { select: CLIENT_SELECT } },
        },
      },
    });
    if (!allocation) throw new NotFoundException('Allocation not found');
    return { data: allocation };
  }

  async create(dto: CreateAllocationDto, actorId: string) {
    // Validate client exists
    const client = await this.prisma.client.findUnique({
      where: { id: dto.clientId },
    });
    if (!client) throw new NotFoundException('Client not found');

    const result = await this.prisma.$transaction(async (tx) => {
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
          message: 'Item is not available for allocation',
          currentStatus: equipment.status,
          attemptedAction: 'allocate_directly',
        });
      }

      let allocation;
      try {
        allocation = await tx.allocation.create({
          data: {
            equipmentId: dto.equipmentId,
            clientId: dto.clientId,
            allocatedByUserId: actorId,
            notes: dto.notes,
          },
          include: {
            client: { select: CLIENT_SELECT },
            equipment: true,
            allocatedBy: {
              select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
            },
          },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new ConflictException('Equipment is already allocated');
        }
        throw error;
      }

      await tx.equipment.update({
        where: { id: dto.equipmentId },
        data: { status: OperationalStatus.ALLOCATED_OUT },
      });

      await tx.auditEntry.create({
        data: {
          event: AuditEvent.ALLOCATED_DIRECTLY,
          equipmentId: dto.equipmentId,
          changedByUserId: actorId,
        },
      });

      return allocation;
    });

    return { data: result };
  }
}
