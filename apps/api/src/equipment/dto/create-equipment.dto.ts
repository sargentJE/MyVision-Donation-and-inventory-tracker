import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { AcquisitionType, Condition, DeviceCategory } from '@prisma/client';

export class CreateEquipmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsEnum(DeviceCategory)
  deviceCategory!: DeviceCategory;

  @IsEnum(AcquisitionType)
  acquisitionType!: AcquisitionType;

  @IsEnum(Condition)
  condition!: Condition;

  @IsDateString()
  acquiredAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  make?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  serialNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  conditionNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  // PURCHASED fields
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

  // DONATED fields — link existing donation OR create inline
  @IsOptional()
  @IsUUID()
  donationId?: string;

  @ValidateIf(
    (o) =>
      !o.donationId &&
      (o.acquisitionType === 'DONATED_DEMO' ||
        o.acquisitionType === 'DONATED_GIVEABLE'),
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  donorName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  donorOrg?: string;

  @IsOptional()
  @IsDateString()
  donatedAt?: string;
}
