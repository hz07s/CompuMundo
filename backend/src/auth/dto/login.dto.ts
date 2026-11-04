import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  nombreUsuario!: string;

  @ApiProperty({ example: 'cambia-esta-clave' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(72) // límite de bytes que Bcrypt considera
  password!: string;
}
