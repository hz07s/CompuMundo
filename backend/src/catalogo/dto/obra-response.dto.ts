import { ApiProperty } from '@nestjs/swagger';
import { EstadoEjemplar } from '../entities/ejemplar.entity';

export class EjemplarResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'CEDIS-2026-000001' })
  codigo!: string;

  @ApiProperty({ enum: EstadoEjemplar, enumName: 'EstadoEjemplar' })
  estado!: EstadoEjemplar;
}

/** Obra con su disponibilidad calculada (ejemplares disponibles). */
export class ObraResumenDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Cálculo diferencial' })
  titulo!: string;

  @ApiProperty({ example: 'Matemáticas' })
  categoria!: string;

  @ApiProperty({ example: ['James Stewart'], type: [String] })
  autores!: string[];

  @ApiProperty({ example: '2012-01-15', format: 'date' })
  fechaPublicacion!: string;

  @ApiProperty({ example: 3, description: 'Ejemplares activos' })
  totalEjemplares!: number;

  @ApiProperty({ example: 3, description: 'Ejemplares disponibles' })
  disponibilidad!: number;

  @ApiProperty()
  creadoEn!: Date;
}

export class ObraDetalleDto extends ObraResumenDto {
  @ApiProperty({ type: [EjemplarResponseDto] })
  ejemplares!: EjemplarResponseDto[];
}

export class ObrasPaginadasDto {
  @ApiProperty({ type: [ObraResumenDto] })
  data!: ObraResumenDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;
}
