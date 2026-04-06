import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { FilterClientsQueryDto } from './dto/filter-clients-query.dto';

@Controller('clients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  // Route BEFORE :id to avoid matching 'search' as UUID
  @Get('search')
  async search(@Query('q') q: string) {
    return this.clientsService.search(q);
  }

  @Get()
  async findAll(@Query() query: FilterClientsQueryDto) {
    return this.clientsService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const detail = await this.clientsService.findById(id);
    return { data: detail };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateClientDto) {
    const client = await this.clientsService.create(dto);
    return { data: client };
  }

  @Post(':id/anonymise')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN)
  async anonymise(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: { id: string },
  ) {
    const client = await this.clientsService.anonymise(id, actor.id);
    return { data: client };
  }
}
