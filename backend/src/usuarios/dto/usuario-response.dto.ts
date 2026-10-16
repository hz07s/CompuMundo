import { ApiProperty } from '@nestjs/swagger';
import { Rol } from '../rol.enum';

export class UsuarioResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'biblio1' })
  nombreUsuario!: string;

  @ApiProperty({ enum: Rol, enumName: 'Rol' })
  rol!: Rol;

  @ApiProperty()
  activo!: boolean;

  @ApiProperty()
  creadoEn!: Date;
}
