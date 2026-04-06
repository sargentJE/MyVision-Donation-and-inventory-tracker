import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Client, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { FilterClientsQueryDto } from './dto/filter-clients-query.dto';
import { ClientDetail, ClientSummary } from './clients.types';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async search(q: string): Promise<{ data: ClientSummary[] }> {
    const trimmed = q?.trim();
    if (!trimmed) return { data: [] };

    const clients = await this.prisma.client.findMany({
      where: {
        OR: [
          { charitylogId: { contains: trimmed, mode: 'insensitive' } },
          { displayName: { contains: trimmed, mode: 'insensitive' } },
        ],
      },
      take: 10,
      orderBy: { displayName: 'asc' },
    });

    return { data: clients.map(this.toSummary) };
  }

  async findAll(query: FilterClientsQueryDto) {
    const { page, pageSize, isAnonymised } = query;
    const where: Prisma.ClientWhereInput = {};
    if (isAnonymised !== undefined) where.isAnonymised = isAnonymised;

    const [clients, total] = await this.prisma.$transaction([
      this.prisma.client.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.client.count({ where }),
    ]);

    return {
      data: clients.map(this.toSummary),
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findById(id: string): Promise<ClientDetail> {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        loans: {
          orderBy: { loanedAt: 'desc' },
          take: 20,
          include: {
            equipment: { select: { id: true, name: true } },
          },
        },
        allocations: {
          orderBy: { allocatedAt: 'desc' },
          take: 20,
          include: {
            equipment: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!client) throw new NotFoundException('Client not found');

    return {
      ...this.toSummary(client),
      createdAt: client.createdAt.toISOString(),
      anonymisedAt: client.anonymisedAt?.toISOString() ?? null,
      loans: client.loans.map((l) => ({
        id: l.id,
        equipmentId: l.equipmentId,
        equipmentName: (l as unknown as { equipment: { name: string } }).equipment.name,
        loanedAt: l.loanedAt.toISOString(),
        expectedReturn: l.expectedReturn?.toISOString() ?? null,
        returnedAt: l.returnedAt?.toISOString() ?? null,
        closedReason: l.closedReason,
      })),
      allocations: client.allocations.map((a) => ({
        id: a.id,
        equipmentId: a.equipmentId,
        equipmentName: (a as unknown as { equipment: { name: string } }).equipment.name,
        allocatedAt: a.allocatedAt.toISOString(),
        originatingLoanId: a.originatingLoanId,
      })),
    };
  }

  async create(dto: CreateClientDto): Promise<ClientSummary> {
    try {
      const client = await this.prisma.client.create({
        data: {
          charitylogId: dto.charitylogId,
          displayName: dto.displayName,
        },
      });
      return this.toSummary(client);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await this.prisma.client.findUnique({
          where: { charitylogId: dto.charitylogId },
        });
        throw new ConflictException({
          error: 'DUPLICATE_CHARITYLOG_ID',
          message: `Client with CharityLog ID "${dto.charitylogId}" already exists`,
          existingClientId: existing?.id,
        });
      }
      throw error;
    }
  }

  async anonymise(id: string, actorId: string): Promise<ClientSummary> {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) throw new NotFoundException('Client not found');

    if (client.isAnonymised) {
      throw new UnprocessableEntityException('Client is already anonymised');
    }

    const updated = await this.prisma.client.update({
      where: { id },
      data: {
        displayName: 'Anonymised',
        isAnonymised: true,
        anonymisedAt: new Date(),
        anonymisedByUserId: actorId,
      },
    });

    return this.toSummary(updated);
  }

  private toSummary(client: Client): ClientSummary {
    return {
      id: client.id,
      charitylogId: client.charitylogId,
      displayName: client.displayName,
      isAnonymised: client.isAnonymised,
    };
  }
}
