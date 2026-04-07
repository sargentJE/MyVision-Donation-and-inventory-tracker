import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { AuditEvent, Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';
import { UserSummary } from '../common/types/user-summary';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FilterUsersQueryDto } from './dto/filter-users-query.dto';
import { normalizeEmail } from '../common/transforms/normalize-email';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}

  async findAll(query: FilterUsersQueryDto) {
    const { page, pageSize, active, role } = query;

    const where: Prisma.UserWhereInput = {};
    if (active !== undefined) where.active = active;
    if (role !== undefined) where.role = role;

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map(this.toUserSummary),
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findById(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    // Defensive normalization: the @NormalizeEmail DTO transform should
    // already have lowercased, but direct callers (seed, internal services)
    // may not go through a DTO.
    return this.prisma.user.findUnique({
      where: { email: normalizeEmail(email) },
    });
  }

  async create(dto: CreateUserDto, actorId: string): Promise<UserSummary> {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    let user: User;
    try {
      user = await this.prisma.user.create({
        data: {
          name: dto.name,
          email: normalizeEmail(dto.email),
          passwordHash,
          role: dto.role,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email already exists');
      }
      throw error;
    }

    await this.auditService.log({
      event: AuditEvent.USER_CREATED,
      targetUserId: user.id,
      changedByUserId: actorId,
    });

    return this.toUserSummary(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserSummary> {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: {
          ...dto,
          ...(dto.email !== undefined && { email: normalizeEmail(dto.email) }),
        },
      });
      return this.toUserSummary(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('User not found');
        }
        if (error.code === 'P2002') {
          throw new ConflictException('Email already exists');
        }
      }
      throw error;
    }
  }

  async deactivate(id: string, actorId: string): Promise<UserSummary> {
    if (id === actorId) {
      throw new ForbiddenException('Cannot deactivate your own account');
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: { active: false },
    });

    await this.authService.revokeAllUserTokens(id);

    await this.auditService.log({
      event: AuditEvent.USER_DEACTIVATED,
      targetUserId: id,
      changedByUserId: actorId,
    });

    return this.toUserSummary(user);
  }

  async reactivate(id: string): Promise<UserSummary> {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: { active: true },
      });
      return this.toUserSummary(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('User not found');
      }
      throw error;
    }
  }

  async resetPassword(id: string, newPassword: string) {
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    try {
      await this.prisma.user.update({
        where: { id },
        data: { passwordHash },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('User not found');
      }
      throw error;
    }

    await this.authService.revokeAllUserTokens(id);

    return { message: 'Password reset' };
  }

  private toUserSummary(user: User): UserSummary {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
