import {
  Inject,
  Injectable,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { UserSummary } from '../common/types/user-summary';
import { parseDuration } from '../common/utils/parse-duration';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}

  async login(
    email: string,
    password: string,
    response: Response,
  ): Promise<UserSummary> {
    const user = await this.usersService.findByEmail(email);

    if (!user || !user.active) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.issueTokens(user, response);

    return this.toUserSummary(user);
  }

  async refresh(
    rawRefreshToken: string,
    response: Response,
  ): Promise<UserSummary> {
    if (!rawRefreshToken) {
      throw new UnauthorizedException('Refresh token required');
    }

    const hash = this.hashToken(rawRefreshToken);

    const storedToken = await this.prisma.refreshToken.findFirst({
      where: { token: hash, revokedAt: null },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: storedToken.userId },
    });

    if (!user || !user.active) {
      throw new UnauthorizedException('User account is inactive');
    }

    // Revoke old token BEFORE issuing new ones to prevent replay
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    await this.issueTokens(user, response);

    return this.toUserSummary(user);
  }

  async logout(
    rawRefreshToken: string | undefined,
    userId: string,
    response: Response,
  ): Promise<void> {
    // Best-effort revocation — scoped to the authenticated user's tokens
    if (rawRefreshToken) {
      const hash = this.hashToken(rawRefreshToken);
      await this.prisma.refreshToken
        .updateMany({
          where: { token: hash, userId, revokedAt: null },
          data: { revokedAt: new Date() },
        })
        .catch(() => {
          // Silently ignore if token not found
        });
    }

    const cookieOptions = this.getCookieOptions();
    response.clearCookie('jwt', cookieOptions);
    response.clearCookie('refreshToken', cookieOptions);
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // ─── Self-service account methods ──────────────

  async getProfile(userId: string): Promise<UserSummary> {
    const user = await this.usersService.findById(userId);
    return this.toUserSummary(user);
  }

  async updateProfile(
    userId: string,
    dto: { name?: string; email?: string },
  ): Promise<UserSummary> {
    const updated = await this.usersService.update(userId, dto);
    return updated;
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    response: Response,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new UnauthorizedException();

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await this.revokeAllUserTokens(userId);

    const cookieOptions = this.getCookieOptions();
    response.clearCookie('jwt', cookieOptions);
    response.clearCookie('refreshToken', cookieOptions);
  }

  private async issueTokens(
    user: { id: string; email: string; role: string },
    response: Response,
  ): Promise<void> {
    // Generate JWT
    const jwt = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    // Generate and store refresh token
    const rawRefreshToken = crypto.randomUUID();
    const hashedRefreshToken = this.hashToken(rawRefreshToken);

    const refreshExpiryMs = parseDuration(
      this.configService.get<string>('REFRESH_TOKEN_EXPIRY', '7d'),
    );

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: hashedRefreshToken,
        expiresAt: new Date(Date.now() + refreshExpiryMs),
      },
    });

    // Set cookies
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    response.cookie('jwt', jwt, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000, // 60 minutes
    });

    response.cookie('refreshToken', rawRefreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private getCookieOptions() {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict' as const,
    };
  }

  private toUserSummary(user: {
    id: string;
    name: string;
    email: string;
    role: string;
    active: boolean;
    createdAt: Date;
  }): UserSummary {
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
