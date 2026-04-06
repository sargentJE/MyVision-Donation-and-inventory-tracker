import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Condition } from '@prisma/client';

export class CreateLoanDto {
  @IsUUID()
  equipmentId!: string;

  @IsUUID()
  clientId!: string;

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
