import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { EquipmentService } from './equipment.service';
import { ImportService } from './import.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { DecommissionDto } from './dto/decommission.dto';
import { ArchiveDto } from './dto/archive.dto';
import { RestoreDto } from './dto/restore.dto';
import { ReclassifyDto } from './dto/reclassify.dto';
import { FilterEquipmentQueryDto } from './dto/filter-equipment-query.dto';

@Controller('equipment')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EquipmentController {
  constructor(
    private readonly equipmentService: EquipmentService,
    private readonly importService: ImportService,
  ) {}

  @Get()
  async findAll(@Query() query: FilterEquipmentQueryDto) {
    return this.equipmentService.findAll(query);
  }

  // Import route BEFORE :id routes
  @Post('import')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async importCsv(
    @UploadedFile() file: Express.Multer.File,
    @Body('dryRun') dryRunStr: string,
    @CurrentUser() actor: { id: string },
  ) {
    if (!file) {
      throw new BadRequestException('CSV file is required');
    }
    const dryRun = dryRunStr !== 'false';
    const result = await this.importService.processImport(
      file.buffer,
      dryRun,
      actor.id,
    );
    return { data: result };
  }

  // IMPORTANT: audit-log route BEFORE :id to avoid matching 'audit-log' as UUID
  @Get(':id/audit-log')
  async getAuditLog(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.equipmentService.getAuditLog(id, query.page, query.pageSize);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const detail = await this.equipmentService.findById(id);
    return { data: detail };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateEquipmentDto,
    @CurrentUser() actor: { id: string },
  ) {
    const detail = await this.equipmentService.create(dto, actor.id);
    return { data: detail };
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEquipmentDto,
    @CurrentUser() actor: { id: string; role: string },
  ) {
    const detail = await this.equipmentService.update(id, dto, actor);
    return { data: detail };
  }

  @Post(':id/decommission')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN)
  async decommission(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecommissionDto,
    @CurrentUser() actor: { id: string },
  ) {
    const detail = await this.equipmentService.decommission(
      id,
      dto,
      actor.id,
    );
    return { data: detail };
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN)
  async archive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ArchiveDto,
    @CurrentUser() actor: { id: string },
  ) {
    const detail = await this.equipmentService.archive(id, dto, actor.id);
    return { data: detail };
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN)
  async restore(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RestoreDto,
    @CurrentUser() actor: { id: string },
  ) {
    const detail = await this.equipmentService.restore(id, dto, actor.id);
    return { data: detail };
  }

  @Post(':id/flag-for-sale')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN)
  async flagForSale(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: { id: string },
  ) {
    const detail = await this.equipmentService.flagForSale(id, actor.id);
    return { data: detail };
  }

  @Post(':id/unflag-for-sale')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN)
  async unflagForSale(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: { id: string },
  ) {
    const detail = await this.equipmentService.unflagForSale(id, actor.id);
    return { data: detail };
  }

  @Post(':id/reclassify')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN)
  async reclassify(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReclassifyDto,
    @CurrentUser() actor: { id: string },
  ) {
    const detail = await this.equipmentService.reclassify(id, dto, actor.id);
    return { data: detail };
  }
}
