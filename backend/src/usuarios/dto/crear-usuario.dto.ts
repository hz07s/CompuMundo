import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { Rol } from '../rol.enum';

/** Google entrega el correo en minúsculas y el login lo busca tal cual (HU-022). */
const normalizarCorreo = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

/** Alta de una cuenta del personal por el Administrador (HU-021, RF-19). */
export class CrearUsuarioDto {
  @ApiProperty({
    example: 'mquispe',
    description:
      '3 a 50 caracteres: minúsculas, números, punto, guion o guion bajo',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString({ message: 'El nombre de usuario debe ser texto' })
  @Matches(/^[a-z0-9._-]{3,50}$/, {
    message:
      'El nombre de usuario debe tener de 3 a 50 caracteres: letras minúsculas, números, punto, guion o guion bajo',
  })
  nombreUsuario!: string;

  @ApiProperty({ example: 'clave-segura-123', minLength: 8, maxLength: 72 })
  @IsString({ message: 'La contraseña debe ser texto' })
  @Length(8, 72, {
    message: 'La contraseña debe tener entre 8 y 72 caracteres',
  })
  password!: string;

  @ApiProperty({ enum: Rol, enumName: 'Rol' })
  @IsEnum(Rol, { message: 'El rol debe ser ADMINISTRADOR o BIBLIOTECARIO' })
  rol!: Rol;

  @ApiPropertyOptional({
    example: 'mquispe@unsa.edu.pe',
    description: 'Correo de Google para iniciar sesión con SSO (HU-022)',
  })
  @IsOptional()
  @Transform(normalizarCorreo)
  @IsEmail({}, { message: 'El correo no es válido' })
  @MaxLength(120, { message: 'El correo admite hasta 120 caracteres' })
  email?: string;
}
