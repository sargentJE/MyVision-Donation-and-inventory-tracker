import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ConvertReservationDto } from './dto/convert-reservation.dto';
import { FilterReservationsQueryDto } from './dto/filter-reservations-query.dto';

@Controller('reservations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Get()
  async findAll(@Query() query: FilterReservationsQueryDto) {
    return this.reservationsService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.reservationsService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateReservationDto,
    @CurrentUser() actor: { id: string },
  ) {
    const reservation = await this.reservationsService.create(dto, actor.id);
    return { data: reservation };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: { id: string },
  ) {
    const reservation = await this.reservationsService.cancel(id, actor.id);
    return { data: reservation };
  }

  @Post(':id/convert')
  @HttpCode(HttpStatus.CREATED)
  async convert(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConvertReservationDto,
    @CurrentUser() actor: { id: string },
  ) {
    return this.reservationsService.convertToLoan(id, dto, actor.id);
  }
}
