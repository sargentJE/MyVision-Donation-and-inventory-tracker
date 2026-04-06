import { IsDateString, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateDemoVisitDto {
  @IsUUID()
  equipmentId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  destination?: string;

  @IsOptional()
  @IsDateString()
  expectedReturn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
