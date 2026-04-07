import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { NormalizeEmail } from '../../common/transforms/normalize-email';

export class UpdateProfileDto {
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
}
