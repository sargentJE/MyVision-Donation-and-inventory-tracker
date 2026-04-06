import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RestoreDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}
