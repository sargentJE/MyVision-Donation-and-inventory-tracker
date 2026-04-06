import {
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
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { DonationsService } from './donations.service';
import { CreateDonationDto } from './dto/create-donation.dto';
import { UpdateDonationDto } from './dto/update-donation.dto';
import { FilterDonationsQueryDto } from './dto/filter-donations-query.dto';

@Controller('donations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DonationsController {
  constructor(private readonly donationsService: DonationsService) {}

  @Get()
  async findAll(@Query() query: FilterDonationsQueryDto) {
    return this.donationsService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.donationsService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateDonationDto) {
    return this.donationsService.create(dto);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDonationDto,
  ) {
    return this.donationsService.update(id, dto);
  }

  @Post(':id/acknowledge')
  @HttpCode(HttpStatus.OK)
  async toggleAcknowledge(@Param('id', ParseUUIDPipe) id: string) {
    return this.donationsService.toggleAcknowledge(id);
  }
}
