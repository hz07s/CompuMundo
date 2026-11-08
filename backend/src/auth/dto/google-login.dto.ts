import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleLoginDto {
  @ApiProperty({
    description:
      'Credencial JWT emitida por Google Identity Services (ID Token)',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...xyz',
  })
  @IsString({ message: 'La credencial de Google debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La credencial de Google es obligatoria' })
  credential!: string;
}
