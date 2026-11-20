import { ApiProperty } from '@nestjs/swagger';

/** Fila del reporte de morosidad (HU-006, P-18). */
export class FilaMorosidadDto {
  @ApiProperty({ example: 'CEDIS-2026-000001' })
  codigoEjemplar!: string;

  @ApiProperty({ example: 'Cálculo diferencial' })
  titulo!: string;

  @ApiProperty({ example: 'Ana Quispe Mamani' })
  lector!: string;

  @ApiProperty({ example: '****8912', description: 'Siempre enmascarado' })
  dni!: string;

  @ApiProperty({ example: '2026-11-02', description: 'AAAA-MM-DD' })
  fechaPrestamo!: string;

  @ApiProperty({ example: '2026-11-05', description: 'AAAA-MM-DD' })
  fechaDevolucion!: string;

  @ApiProperty({
    example: 14,
    description: 'Días calendario desde la fecha pactada hasta hoy (Lima)',
  })
  diasAtraso!: number;

  @ApiProperty({ example: 'biblio1', nullable: true, type: String })
  registradoPor!: string | null;
}

export class MorosidadResponseDto {
  @ApiProperty({ description: 'Marca temporal de generación (ISO 8601)' })
  generadoEn!: string;

  @ApiProperty({ example: 1 })
  total!: number;

  @ApiProperty({ type: [FilaMorosidadDto] })
  filas!: FilaMorosidadDto[];
}
