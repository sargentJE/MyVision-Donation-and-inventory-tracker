import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { NormalizeEmail } from '../../common/transforms/normalize-email';

export class LoginDto {
  @NormalizeEmail()
  @IsEmail({ require_tld: false })
  @IsNotEmpty()
  @MaxLength(255)
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}
