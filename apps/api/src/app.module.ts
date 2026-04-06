import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { EquipmentModule } from './equipment/equipment.module';
import { ClientsModule } from './clients/clients.module';
import { ReservationsModule } from './reservations/reservations.module';
import { LoansModule } from './loans/loans.module';
import { AllocationsModule } from './allocations/allocations.module';
import { DemoVisitsModule } from './demo-visits/demo-visits.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DonationsModule } from './donations/donations.module';
import { ReportsModule } from './reports/reports.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    // Global config — validates and exposes env vars via ConfigService
    ConfigModule.forRoot({ isGlobal: true }),
    // Rate limiting — 300 req/min per IP (configurable via env)
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('THROTTLE_TTL', 60000),
          limit: config.get<number>('THROTTLE_LIMIT', 300),
        },
      ],
    }),
    // Scheduled tasks (notification cron)
    ScheduleModule.forRoot(),
    // Database access
    PrismaModule,
    // Domain modules
    AuditModule,
    AuthModule,
    UsersModule,
    EquipmentModule,
    ClientsModule,
    ReservationsModule,
    LoansModule,
    AllocationsModule,
    DemoVisitsModule,
    NotificationsModule,
    DashboardModule,
    DonationsModule,
    ReportsModule,
  ],
  controllers: [HealthController],
  providers: [
    // Apply throttler globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
