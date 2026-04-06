import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { AcquisitionType } from '@prisma/client';

export class ReclassifyDto {
  @IsEnum(AcquisitionType)
  acquisitionType!: AcquisitionType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  reason!: string;
}
