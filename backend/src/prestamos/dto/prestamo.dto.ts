import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Trim } from '../../common/decorators/trim.decorator';
import { EstadoPrestamo } from '../entities/prestamo.entity';

export class CrearPrestamoDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Lector obtenido en la verificación presencial',
  })
  @IsNotEmpty({ message: 'El lector es obligatorio' })
  @IsUUID('4', { message: 'El lector no es válido' })
  lectorId!: string;

  @ApiProperty({ example: 'CEDIS-2026-000001' })
  @Trim()
  @IsNotEmpty({ message: 'El código del ejemplar es obligatorio' })
  @IsString({ message: 'El código del ejemplar debe ser texto' })
  @MaxLength(20, {
    message: 'El código del ejemplar admite hasta 20 caracteres',
  })
  codigoEjemplar!: string;

  @ApiPropertyOptional({
    maxLength: 500,
    description:
      'Justificación escrita del Bibliotecario. Obligatoria si el lector está en advertencia por morosidad (RN-02).',
  })
  @Trim()
  @IsOptional()
  @IsString({ message: 'La justificación debe ser texto' })
  @MaxLength(500, { message: 'La justificación admite hasta 500 caracteres' })
  justificacion?: string;
}

class EjemplarPrestadoDto {
  @ApiProperty({ example: 'CEDIS-2026-000001' })
  codigo!: string;

  @ApiProperty({ example: 'Cálculo diferencial' })
  titulo!: string;
}

class LectorPrestamoDto {
  @ApiProperty({ example: 'Ana' })
  nombres!: string;

  @ApiProperty({ example: 'Quispe' })
  apellidos!: string;

  @ApiProperty({ example: '****8912', description: 'DNI enmascarado (RNF-02)' })
  dni!: string;
}

export class PrestamoResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: EstadoPrestamo, enumName: 'EstadoPrestamo' })
  estado!: EstadoPrestamo;

  @ApiProperty({ example: '2026-11-06', format: 'date' })
  fechaPrestamo!: string;

  @ApiProperty({
    example: '2026-11-11',
    format: 'date',
    description: 'Fecha del préstamo + 3 días hábiles (RN-01)',
  })
  fechaDevolucion!: string;

  @ApiProperty({ nullable: true, type: String })
  justificacion!: string | null;

  @ApiProperty({ type: EjemplarPrestadoDto })
  ejemplar!: EjemplarPrestadoDto;

  @ApiProperty({ type: LectorPrestamoDto })
  lector!: LectorPrestamoDto;

  @ApiProperty()
  creadoEn!: Date;
}
