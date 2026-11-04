import { ApiProperty } from '@nestjs/swagger';
import { Rol } from '../../usuarios/rol.enum';

export class UsuarioSesionDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'admin' })
  nombreUsuario!: string;

  @ApiProperty({ enum: Rol, enumName: 'Rol' })
  rol!: Rol;
}

export class SesionResponseDto {
  @ApiProperty({ description: 'JWT para el header Authorization: Bearer' })
  accessToken!: string;

  @ApiProperty({
    example: 28800,
    description: 'Segundos de vigencia del access token',
  })
  expiresIn!: number;

  @ApiProperty({ type: UsuarioSesionDto })
  usuario!: UsuarioSesionDto;
}
