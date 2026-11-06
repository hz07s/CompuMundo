import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Trim } from '../../common/decorators/trim.decorator';
import { CategoriaLector } from '../entities/lector.entity';

/** DNI a verificar. Viaja en el cuerpo, no en la URL, para que no quede en logs de acceso. */
export class VerificarLectorDto {
  @ApiProperty({ example: '12345678', description: '8 dígitos numéricos' })
  @Trim()
  @IsNotEmpty({ message: 'El DNI es obligatorio' })
  @IsString({ message: 'El DNI debe ser texto' })
  @MaxLength(20, { message: 'El DNI no tiene un formato válido' })
  dni!: string;
}

/**
 * Lector en la pantalla de verificación presencial del préstamo (RNF-02):
 * único contexto donde el DNI se muestra completo.
 */
export class LectorVerificacionDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({
    example: '45678912',
    description: 'DNI completo: solo en la verificación presencial',
  })
  dni!: string;

  @ApiProperty({ example: 'Ana María' })
  nombres!: string;

  @ApiProperty({ example: 'Quispe Mamani' })
  apellidos!: string;

  @ApiProperty({ enum: CategoriaLector, enumName: 'CategoriaLector' })
  categoria!: CategoriaLector;

  @ApiProperty({ description: 'Menor de 18 años' })
  esMenor!: boolean;

  @ApiProperty({ example: 'Rosa Mamani', nullable: true, type: String })
  apoderadoNombre!: string | null;

  @ApiProperty({
    example: '****4321',
    nullable: true,
    type: String,
    description: 'El DNI del apoderado siempre se muestra enmascarado',
  })
  apoderadoDni!: string | null;

  @ApiProperty()
  activo!: boolean;
}
