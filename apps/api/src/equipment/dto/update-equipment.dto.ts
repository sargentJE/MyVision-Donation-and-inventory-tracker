import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Condition } from '@prisma/client';

export class UpdateEquipmentDto {
  // Staff-editable fields
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  make?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  model?: string;

  @IsOptional()
  @IsEnum(Condition)
  condition?: Condition;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  conditionNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  // Admin-only fields (enforced in service layer)
  @IsOptional()
  @IsString()
  @MaxLength(255)
  serialNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  purchasePrice?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  supplier?: string;

  @IsOptional()
  @IsDateString()
  warrantyExpiry?: string;
}
