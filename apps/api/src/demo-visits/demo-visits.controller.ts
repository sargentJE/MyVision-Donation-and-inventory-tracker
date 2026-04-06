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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DemoVisitsService } from './demo-visits.service';
import { CreateDemoVisitDto } from './dto/create-demo-visit.dto';
import { ReturnDemoVisitDto } from './dto/return-demo-visit.dto';
import { FilterDemoVisitsQueryDto } from './dto/filter-demo-visits-query.dto';

@Controller('demo-visits')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DemoVisitsController {
  constructor(private readonly demoVisitsService: DemoVisitsService) {}

  @Get()
  async findAll(@Query() query: FilterDemoVisitsQueryDto) {
    return this.demoVisitsService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.demoVisitsService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async start(
    @Body() dto: CreateDemoVisitDto,
    @CurrentUser() actor: { id: string },
  ) {
    return this.demoVisitsService.start(dto, actor.id);
  }

  @Post(':id/return')
  @HttpCode(HttpStatus.OK)
  async returnVisit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReturnDemoVisitDto,
    @CurrentUser() actor: { id: string },
  ) {
    return this.demoVisitsService.returnVisit(id, dto, actor.id);
  }
}
