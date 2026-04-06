import { IsDateString, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDonationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  donorName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  donorOrg?: string;

  @IsDateString()
  donatedAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
