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
import { LoansService } from './loans.service';
import { CreateLoanDto } from './dto/create-loan.dto';
import { ReturnLoanDto } from './dto/return-loan.dto';
import { ConvertLoanDto } from './dto/convert-loan.dto';
import { FilterLoansQueryDto } from './dto/filter-loans-query.dto';

@Controller('loans')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Get()
  async findAll(@Query() query: FilterLoansQueryDto) {
    return this.loansService.findAll(query);
  }

  // Receipt route BEFORE :id to avoid matching 'receipt' as UUID
  @Get(':id/receipt')
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  async getReceipt(@Param('id', ParseUUIDPipe) _id: string) {
    return {
      error: 'NOT_IMPLEMENTED',
      message: 'Receipt PDF generation is not yet available',
    };
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.loansService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateLoanDto,
    @CurrentUser() actor: { id: string },
  ) {
    return this.loansService.create(dto, actor.id);
  }

  @Post(':id/return')
  @HttpCode(HttpStatus.OK)
  async returnLoan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReturnLoanDto,
    @CurrentUser() actor: { id: string },
  ) {
    return this.loansService.returnLoan(id, dto, actor.id);
  }

  @Post(':id/convert-to-allocation')
  @HttpCode(HttpStatus.CREATED)
  async convertToAllocation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConvertLoanDto,
    @CurrentUser() actor: { id: string },
  ) {
    return this.loansService.convertToAllocation(id, dto, actor.id);
  }
}
