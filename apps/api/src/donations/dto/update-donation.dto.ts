import { IsDateString, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateDonationDto {
  @IsOptional()
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

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
