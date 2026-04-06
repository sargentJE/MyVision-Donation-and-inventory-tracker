import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ArchiveDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}
