import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  AcquisitionType,
  AuditEvent,
  LoanCloseReason,
  OperationalStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateLoanDto } from './dto/create-loan.dto';
import { ReturnLoanDto } from './dto/return-loan.dto';
import { ConvertLoanDto } from './dto/convert-loan.dto';
import { FilterLoansQueryDto } from './dto/filter-loans-query.dto';

const CLIENT_SELECT = {
  id: true,
  charitylogId: true,
  displayName: true,
  isAnonymised: true,
} as const;

@Injectable()
export class LoansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll(query: FilterLoansQueryDto) {
    const { page, pageSize } = query;
    const where: Prisma.LoanWhereInput = {};

    if (query.equipmentId) where.equipmentId = query.equipmentId;
    if (query.clientId) where.clientId = query.clientId;

    if (query.active || query.overdue) {
      where.returnedAt = null;
      where.closedReason = null;
    }

    if (query.overdue) {
      where.expectedReturn = { not: null, lt: new Date() };
    }

    const [loans, total] = await this.prisma.$transaction([
      this.prisma.loan.findMany({
        where,
        orderBy: { loanedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          client: { select: CLIENT_SELECT },
          equipment: { select: { id: true, name: true, serialNumber: true } },
        },
      }),
      this.prisma.loan.count({ where }),
    ]);

    return {
      data: loans.map((l) => ({
        id: l.id,
        equipmentId: l.equipmentId,
        equipmentName: (l as { equipment: { name: string } }).equipment.name,
        clientId: l.clientId,
        client: l.client,
        loanedAt: l.loanedAt.toISOString(),
        expectedReturn: l.expectedReturn?.toISOString() ?? null,
        returnedAt: l.returnedAt?.toISOString() ?? null,
        conditionAtLoan: l.conditionAtLoan,
        closedReason: l.closedReason,
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
    const loan = await this.prisma.loan.findUnique({
      where: { id },
      include: {
        client: { select: CLIENT_SELECT },
        equipment: true,
        closedBy: {
          select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
        },
        originatingReservation: {
          include: { client: { select: CLIENT_SELECT } },
        },
        allocation: {
          include: { client: { select: CLIENT_SELECT } },
        },
      },
    });
    if (!loan) throw new NotFoundException('Loan not found');
    return { data: loan };
  }

  async create(dto: CreateLoanDto, actorId: string) {
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
          message: 'Item is not available for loan',
          currentStatus: equipment.status,
          attemptedAction: 'issue_loan',
        });
      }

      const loan = await tx.loan.create({
        data: {
          equipmentId: dto.equipmentId,
          clientId: dto.clientId,
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
        },
      });

      await tx.equipment.update({
        where: { id: dto.equipmentId },
        data: { status: OperationalStatus.ON_LOAN },
      });

      await tx.auditEntry.create({
        data: {
          event: AuditEvent.LOAN_ISSUED,
          equipmentId: dto.equipmentId,
          changedByUserId: actorId,
        },
      });

      return loan;
    });

    return { data: result };
  }

  async returnLoan(id: string, dto: ReturnLoanDto, actorId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const loan = await tx.loan.findUnique({
        where: { id },
        include: { client: { select: CLIENT_SELECT } },
      });
      if (!loan) throw new NotFoundException('Loan not found');

      if (loan.returnedAt || loan.closedReason) {
        throw new UnprocessableEntityException('Loan is not active');
      }

      const now = new Date();
      const updated = await tx.loan.update({
        where: { id },
        data: {
          returnedAt: now,
          closedReason: LoanCloseReason.RETURNED,
          closedByUserId: actorId,
          conditionAtReturn: dto.conditionAtReturn,
          conditionAtReturnNotes: dto.conditionAtReturnNotes,
          notes: dto.notes ? `${loan.notes ? loan.notes + '\n' : ''}${dto.notes}` : undefined,
        },
        include: {
          client: { select: CLIENT_SELECT },
          equipment: true,
        },
      });

      await tx.equipment.update({
        where: { id: loan.equipmentId },
        data: { status: OperationalStatus.AVAILABLE_FOR_LOAN },
      });

      await tx.auditEntry.create({
        data: {
          event: AuditEvent.LOAN_RETURNED,
          equipmentId: loan.equipmentId,
          changedByUserId: actorId,
        },
      });

      return updated;
    });

    await this.notificationsService.resolveByLoan(id);

    return { data: result };
  }

  async convertToAllocation(id: string, dto: ConvertLoanDto, actorId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const loan = await tx.loan.findUnique({
        where: { id },
        include: { client: { select: CLIENT_SELECT } },
      });
      if (!loan) throw new NotFoundException('Loan not found');

      if (loan.returnedAt || loan.closedReason) {
        throw new UnprocessableEntityException('Loan is not active');
      }

      const now = new Date();

      // Close the loan
      await tx.loan.update({
        where: { id },
        data: {
          returnedAt: now,
          closedReason: LoanCloseReason.CONVERTED_TO_ALLOCATION,
          closedByUserId: actorId,
        },
      });

      // Create allocation
      const allocation = await tx.allocation.create({
        data: {
          equipmentId: loan.equipmentId,
          clientId: loan.clientId,
          allocatedByUserId: actorId,
          originatingLoanId: loan.id,
          notes: dto.notes,
        },
        include: {
          client: { select: CLIENT_SELECT },
          equipment: true,
          allocatedBy: {
            select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
          },
          originatingLoan: { include: { client: { select: CLIENT_SELECT } } },
        },
      });

      // Update equipment status
      await tx.equipment.update({
        where: { id: loan.equipmentId },
        data: { status: OperationalStatus.ALLOCATED_OUT },
      });

      await tx.auditEntry.create({
        data: {
          event: AuditEvent.LOAN_CONVERTED_TO_ALLOCATION,
          equipmentId: loan.equipmentId,
          changedByUserId: actorId,
          note: 'Loan converted to permanent allocation',
        },
      });

      return allocation;
    });

    await this.notificationsService.resolveByLoan(id);

    return { data: result };
  }
}
