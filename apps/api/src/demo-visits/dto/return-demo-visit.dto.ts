import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { Condition } from '@prisma/client';

export class ReturnDemoVisitDto {
  @IsOptional()
  @IsEnum(Condition)
  conditionOnReturn?: Condition;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  conditionOnReturnNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
