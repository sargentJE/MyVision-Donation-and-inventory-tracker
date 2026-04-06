import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateAllocationDto {
  @IsUUID()
  equipmentId!: string;

  @IsUUID()
  clientId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
