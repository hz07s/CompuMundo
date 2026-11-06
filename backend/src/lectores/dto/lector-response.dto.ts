import { ApiProperty } from '@nestjs/swagger';
import { CategoriaLector } from '../entities/lector.entity';

/** Lector tal como lo ve el personal: el DNI siempre enmascarado (RNF-02). */
export class LectorResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: '****5678', description: 'DNI enmascarado' })
  dni!: string;

  @ApiProperty({ example: 'Ana María' })
  nombres!: string;

  @ApiProperty({ example: 'Quispe Mamani' })
  apellidos!: string;

  @ApiProperty({ enum: CategoriaLector, enumName: 'CategoriaLector' })
  categoria!: CategoriaLector;

  @ApiProperty({ example: '2000-05-10', format: 'date' })
  fechaNacimiento!: string;

  @ApiProperty({ description: 'Menor de 18 años a la fecha del alta' })
  esMenor!: boolean;

  @ApiProperty({ example: 'Rosa Mamani', nullable: true, type: String })
  apoderadoNombre!: string | null;

  @ApiProperty({ example: '****4321', nullable: true, type: String })
  apoderadoDni!: string | null;

  @ApiProperty()
  consentimientoApoderado!: boolean;

  @ApiProperty()
  activo!: boolean;

  @ApiProperty()
  creadoEn!: Date;
}
