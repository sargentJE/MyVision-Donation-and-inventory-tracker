import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('inventory')
  async getInventory(
    @Query('format') format: string,
    @Query('status') status: string | string[],
    @Query('acquisitionType') acquisitionType: string | string[],
    @Query('deviceCategory') deviceCategory: string | string[],
    @Query('isArchived') isArchived: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const filters = {
      status: status ? (Array.isArray(status) ? status : [status]) : undefined,
      acquisitionType: acquisitionType
        ? Array.isArray(acquisitionType) ? acquisitionType : [acquisitionType]
        : undefined,
      deviceCategory: deviceCategory
        ? Array.isArray(deviceCategory) ? deviceCategory : [deviceCategory]
        : undefined,
      isArchived: isArchived === 'true' ? true : undefined,
    };

    const result = await this.reportsService.getInventory(filters);
    return this.respond(res, format, 'inventory', result);
  }

  @Get('active-loans')
  async getActiveLoans(
    @Query('format') format: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.reportsService.getActiveLoans();
    return this.respond(res, format, 'active-loans', result);
  }

  @Get('overdue')
  async getOverdue(
    @Query('format') format: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.reportsService.getOverdueLoans();
    return this.respond(res, format, 'overdue-loans', result);
  }

  @Get('demo-visits')
  async getDemoVisits(
    @Query('format') format: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.reportsService.getActiveDemoVisits();
    return this.respond(res, format, 'demo-visits', result);
  }

  @Get('allocations')
  async getAllocations(
    @Query('format') format: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.reportsService.getAllocations();
    return this.respond(res, format, 'allocations', result);
  }

  @Get('utilisation')
  async getUtilisation(
    @Query('format') format: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.reportsService.getUtilisation();
    return this.respond(res, format, 'utilisation', result);
  }

  private respond(
    res: Response,
    format: string | undefined,
    name: string,
    result: { json: unknown; csv: string },
  ) {
    if (format === 'csv') {
      const date = new Date().toISOString().split('T')[0];
      res.set({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${name}-${date}.csv"`,
      });
      res.send(result.csv);
      return;
    }
    return { data: result.json };
  }
}
