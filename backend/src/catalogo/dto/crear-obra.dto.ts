import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Trim } from '../../common/decorators/trim.decorator';

export const MAX_EJEMPLARES_POR_ALTA = 500;
export const MAX_VOLUMEN = 9999;
export const ANIO_EDICION_MIN = 1000;
export const ANIO_EDICION_MAX = 9999;

/** Cantidad de ejemplares: entero positivo (HU-002 #3). */
export class CantidadEjemplaresDto {
  @ApiProperty({ example: 3, minimum: 1, maximum: MAX_EJEMPLARES_POR_ALTA })
  @IsNotEmpty({ message: 'La cantidad es obligatoria' })
  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @Min(1, { message: 'La cantidad debe ser mayor que 0' })
  @Max(MAX_EJEMPLARES_POR_ALTA, {
    message: `La cantidad no puede superar ${MAX_EJEMPLARES_POR_ALTA} por registro`,
  })
  cantidad!: number;
}

/** Campos obligatorios de una obra (P-18) y cantidad de ejemplares a crear. */
export class CrearObraDto extends CantidadEjemplaresDto {
  @ApiProperty({ example: 'Cálculo diferencial', maxLength: 255 })
  @Trim()
  @IsNotEmpty({ message: 'El título es obligatorio' })
  @IsString({ message: 'El título debe ser texto' })
  @MaxLength(255, { message: 'El título admite hasta 255 caracteres' })
  titulo!: string;

  @ApiProperty({ example: 'Matemáticas', maxLength: 100 })
  @Trim()
  @IsNotEmpty({ message: 'La categoría es obligatoria' })
  @IsString({ message: 'La categoría debe ser texto' })
  @MaxLength(100, { message: 'La categoría admite hasta 100 caracteres' })
  categoria!: string;

  @ApiProperty({ example: ['James Stewart'], type: [String] })
  @Trim()
  @ArrayNotEmpty({ message: 'Indique al menos un autor' })
  @IsArray({ message: 'Los autores deben ser una lista' })
  @ArrayMaxSize(20, { message: 'Se admiten hasta 20 autores' })
  @IsString({ each: true, message: 'Cada autor debe ser texto' })
  @IsNotEmpty({ each: true, message: 'Ningún autor puede estar vacío' })
  @MaxLength(150, {
    each: true,
    message: 'Cada autor admite hasta 150 caracteres',
  })
  autores!: string[];

  @ApiProperty({ example: '2012-01-15', format: 'date' })
  @IsNotEmpty({ message: 'La fecha de publicación es obligatoria' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha de publicación debe tener el formato AAAA-MM-DD',
  })
  @IsISO8601(
    { strict: true },
    { message: 'La fecha de publicación no es una fecha válida' },
  )
  fechaPublicacion!: string;

  @ApiPropertyOptional({ example: 2, minimum: 1, description: 'Volumen' })
  @IsOptional()
  @IsInt({ message: 'El volumen debe ser un número entero' })
  @Min(1, { message: 'El volumen debe ser mayor o igual que 1' })
  @Max(MAX_VOLUMEN, { message: `El volumen no puede superar ${MAX_VOLUMEN}` })
  volumen?: number;

  @ApiProperty({
    example: 2012,
    minimum: ANIO_EDICION_MIN,
    maximum: ANIO_EDICION_MAX,
  })
  @IsNotEmpty({ message: 'El año de edición es obligatorio' })
  @IsInt({ message: 'El año de edición debe ser un número entero' })
  @Min(ANIO_EDICION_MIN, {
    message: 'El año de edición debe tener 4 dígitos',
  })
  @Max(ANIO_EDICION_MAX, {
    message: 'El año de edición debe tener 4 dígitos',
  })
  anioEdicion!: number;
}
