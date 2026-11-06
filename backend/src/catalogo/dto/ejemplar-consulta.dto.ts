import { ApiProperty } from '@nestjs/swagger';
import { EstadoEjemplar } from '../entities/ejemplar.entity';

class ObraDeEjemplarDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Cálculo diferencial' })
  titulo!: string;
}

/** Ejemplar con su obra y disponibilidad, para decidir el préstamo (HU-004). */
export class EjemplarConsultaDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'CEDIS-2026-000001' })
  codigo!: string;

  @ApiProperty({ enum: EstadoEjemplar, enumName: 'EstadoEjemplar' })
  estado!: EstadoEjemplar;

  @ApiProperty({ description: 'Se puede prestar ahora' })
  disponible!: boolean;

  @ApiProperty({ type: ObraDeEjemplarDto })
  obra!: ObraDeEjemplarDto;
}
