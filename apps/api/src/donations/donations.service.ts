import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDonationDto } from './dto/create-donation.dto';
import { UpdateDonationDto } from './dto/update-donation.dto';
import { FilterDonationsQueryDto } from './dto/filter-donations-query.dto';

@Injectable()
export class DonationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: FilterDonationsQueryDto) {
    const { page, pageSize } = query;
    const where: Prisma.DonationWhereInput = {};
    if (query.acknowledgementSent !== undefined)
      where.acknowledgementSent = query.acknowledgementSent;

    const [donations, total] = await this.prisma.$transaction([
      this.prisma.donation.findMany({
        where,
        orderBy: { donatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { _count: { select: { items: true } } },
      }),
      this.prisma.donation.count({ where }),
    ]);

    return {
      data: donations.map((d) => ({
        id: d.id,
        donorName: d.donorName,
        donorOrg: d.donorOrg,
        donatedAt: d.donatedAt.toISOString(),
        acknowledgementSent: d.acknowledgementSent,
        itemCount: d._count.items,
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
    const donation = await this.prisma.donation.findUnique({
      where: { id },
      include: {
        items: {
          select: {
            id: true,
            name: true,
            status: true,
            condition: true,
            createdAt: true,
          },
        },
      },
    });
    if (!donation) throw new NotFoundException('Donation not found');

    return {
      data: {
        id: donation.id,
        donorName: donation.donorName,
        donorOrg: donation.donorOrg,
        donatedAt: donation.donatedAt.toISOString(),
        acknowledgementSent: donation.acknowledgementSent,
        notes: donation.notes,
        items: donation.items.map((i) => ({
          id: i.id,
          name: i.name,
          status: i.status,
          condition: i.condition,
          createdAt: i.createdAt.toISOString(),
        })),
      },
    };
  }

  async create(dto: CreateDonationDto) {
    const donation = await this.prisma.donation.create({
      data: {
        donorName: dto.donorName,
        donorOrg: dto.donorOrg,
        donatedAt: new Date(dto.donatedAt),
        notes: dto.notes,
      },
    });

    return {
      data: {
        id: donation.id,
        donorName: donation.donorName,
        donorOrg: donation.donorOrg,
        donatedAt: donation.donatedAt.toISOString(),
        acknowledgementSent: donation.acknowledgementSent,
      },
    };
  }

  async update(id: string, dto: UpdateDonationDto) {
    try {
      const donation = await this.prisma.donation.update({
        where: { id },
        data: {
          donorName: dto.donorName,
          donorOrg: dto.donorOrg,
          donatedAt: dto.donatedAt ? new Date(dto.donatedAt) : undefined,
          notes: dto.notes,
        },
      });

      return {
        data: {
          id: donation.id,
          donorName: donation.donorName,
          donorOrg: donation.donorOrg,
          donatedAt: donation.donatedAt.toISOString(),
          acknowledgementSent: donation.acknowledgementSent,
          notes: donation.notes,
        },
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Donation not found');
      }
      throw error;
    }
  }

  async toggleAcknowledge(id: string) {
    const donation = await this.prisma.donation.findUnique({
      where: { id },
    });
    if (!donation) throw new NotFoundException('Donation not found');

    const updated = await this.prisma.donation.update({
      where: { id },
      data: { acknowledgementSent: !donation.acknowledgementSent },
    });

    return {
      data: {
        id: updated.id,
        donorName: updated.donorName,
        donorOrg: updated.donorOrg,
        donatedAt: updated.donatedAt.toISOString(),
        acknowledgementSent: updated.acknowledgementSent,
      },
    };
  }
}
