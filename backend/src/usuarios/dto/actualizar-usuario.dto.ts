import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { Rol } from '../rol.enum';

/**
 * Cambios del Administrador sobre una cuenta (HU-021): rol, baja lógica
 * (RNF-07) o una nueva contraseña. Todos los campos son opcionales.
 */
export class ActualizarUsuarioDto {
  @ApiPropertyOptional({ enum: Rol, enumName: 'Rol' })
  @IsOptional()
  @IsEnum(Rol, { message: 'El rol debe ser ADMINISTRADOR o BIBLIOTECARIO' })
  rol?: Rol;

  @ApiPropertyOptional({ description: 'false = deshabilitar la cuenta' })
  @IsOptional()
  @IsBoolean({ message: 'activo debe ser verdadero o falso' })
  activo?: boolean;

  @ApiPropertyOptional({ minLength: 8, maxLength: 72 })
  @IsOptional()
  @IsString({ message: 'La contraseña debe ser texto' })
  @Length(8, 72, {
    message: 'La contraseña debe tener entre 8 y 72 caracteres',
  })
  password?: string;
}
