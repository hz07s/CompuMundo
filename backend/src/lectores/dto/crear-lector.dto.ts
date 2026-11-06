import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { Trim } from '../../common/decorators/trim.decorator';
import { CategoriaLector } from '../entities/lector.entity';

/**
 * Datos de alta de un lector (HU-003). El formato del DNI lo comprueba
 * IDniValidator en el servicio, no el DTO (RNF-11).
 */
export class CrearLectorDto {
  @ApiProperty({ example: '12345678', description: '8 dígitos numéricos' })
  @Trim()
  @IsNotEmpty({ message: 'El DNI es obligatorio' })
  @IsString({ message: 'El DNI debe ser texto' })
  @MaxLength(20, { message: 'El DNI no tiene un formato válido' })
  dni!: string;

  @ApiProperty({ example: 'Ana María', maxLength: 100 })
  @Trim()
  @IsNotEmpty({ message: 'Los nombres son obligatorios' })
  @IsString({ message: 'Los nombres deben ser texto' })
  @MaxLength(100, { message: 'Los nombres admiten hasta 100 caracteres' })
  nombres!: string;

  @ApiProperty({ example: 'Quispe Mamani', maxLength: 100 })
  @Trim()
  @IsNotEmpty({ message: 'Los apellidos son obligatorios' })
  @IsString({ message: 'Los apellidos deben ser texto' })
  @MaxLength(100, { message: 'Los apellidos admiten hasta 100 caracteres' })
  apellidos!: string;

  @ApiProperty({ enum: CategoriaLector, enumName: 'CategoriaLector' })
  @IsNotEmpty({ message: 'La categoría es obligatoria' })
  @IsEnum(CategoriaLector, {
    message: `La categoría debe ser una de: ${Object.values(CategoriaLector).join(', ')}`,
  })
  categoria!: CategoriaLector;

  @ApiProperty({ example: '2000-05-10', format: 'date' })
  @IsNotEmpty({ message: 'La fecha de nacimiento es obligatoria' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha de nacimiento debe tener el formato AAAA-MM-DD',
  })
  @IsISO8601(
    { strict: true },
    { message: 'La fecha de nacimiento no es una fecha válida' },
  )
  fechaNacimiento!: string;

  @ApiPropertyOptional({
    example: '87654321',
    description: 'Obligatorio si el lector es menor de 18 años (RN-09)',
  })
  @Trim()
  @IsOptional()
  @IsString({ message: 'El DNI del apoderado debe ser texto' })
  @MaxLength(20, { message: 'El DNI del apoderado no tiene un formato válido' })
  apoderadoDni?: string;

  @ApiPropertyOptional({ example: 'Rosa Mamani', maxLength: 200 })
  @Trim()
  @IsOptional()
  @IsString({ message: 'El nombre del apoderado debe ser texto' })
  @MaxLength(200, {
    message: 'El nombre del apoderado admite hasta 200 caracteres',
  })
  apoderadoNombre?: string;

  @ApiPropertyOptional({
    description: 'Consentimiento firmado recibido (menores de edad)',
  })
  @IsOptional()
  @IsBoolean({ message: 'El consentimiento debe ser verdadero o falso' })
  consentimientoApoderado?: boolean;
}
