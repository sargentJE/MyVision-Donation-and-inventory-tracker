import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Role } from '@prisma/client';
import { NormalizeEmail } from '../../common/transforms/normalize-email';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @NormalizeEmail()
  @IsEmail({ require_tld: false })
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
