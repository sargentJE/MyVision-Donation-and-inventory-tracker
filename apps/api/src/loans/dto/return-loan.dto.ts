import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { Condition } from '@prisma/client';

export class ReturnLoanDto {
  @IsOptional()
  @IsEnum(Condition)
  conditionAtReturn?: Condition;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  conditionAtReturnNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
