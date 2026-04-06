import { Injectable } from '@nestjs/common';
import { AuditEntry, AuditEvent } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface LogParams {
  event: AuditEvent;
  changedByUserId: string;
  equipmentId?: string;
  targetUserId?: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  note?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: LogParams): Promise<AuditEntry> {
    return this.prisma.auditEntry.create({
      data: {
        event: params.event,
        changedByUserId: params.changedByUserId,
        equipmentId: params.equipmentId,
        targetUserId: params.targetUserId,
        field: params.field,
        oldValue: params.oldValue,
        newValue: params.newValue,
        note: params.note,
      },
    });
  }

  async findByEquipment(
    equipmentId: string,
    page: number,
    pageSize: number,
  ): Promise<PaginatedResult<AuditEntry>> {
    const where = { equipmentId };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditEntry.findMany({
        where,
        orderBy: { changedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          changedBy: {
            select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
          },
          targetUser: {
            select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
          },
        },
      }),
      this.prisma.auditEntry.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }
}
