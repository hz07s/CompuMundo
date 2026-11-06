import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Trim } from '../../common/decorators/trim.decorator';

export class DesbloquearLectorDto {
  @ApiProperty({
    example: 'Regularizó la devolución con el CEDIS',
    maxLength: 500,
  })
  @Trim()
  @IsNotEmpty({ message: 'El motivo del desbloqueo es obligatorio' })
  @IsString({ message: 'El motivo debe ser texto' })
  @MaxLength(500, { message: 'El motivo admite hasta 500 caracteres' })
  motivo!: string;
}

export class DesbloqueoResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  lectorId!: string;

  @ApiProperty()
  motivo!: string;

  @ApiProperty({ format: 'uuid', description: 'Administrador que desbloqueó' })
  desbloqueadoPor!: string;

  @ApiProperty()
  creadoEn!: Date;
}
