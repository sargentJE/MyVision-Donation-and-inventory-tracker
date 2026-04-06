import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateClientDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  charitylogId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  displayName!: string;
}
