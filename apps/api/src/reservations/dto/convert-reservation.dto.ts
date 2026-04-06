import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { Condition } from '@prisma/client';

export class ConvertReservationDto {
  @IsOptional()
  @IsDateString()
  expectedReturn?: string;

  @IsOptional()
  @IsEnum(Condition)
  conditionAtLoan?: Condition;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  conditionAtLoanNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
