import { Controller, HttpCode, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { Rol } from '../usuarios/rol.enum';
import { VencidosService } from './vencidos.service';

export class MarcadoVencidosResponseDto {
  @ApiProperty({ example: 2, description: 'Préstamos que pasaron a Vencido' })
  marcados!: number;
}

@ApiTags('prestamos')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Sin token o token vencido' })
@Roles(Rol.ADMINISTRADOR)
@Controller('prestamos/vencidos')
export class VencidosController {
  constructor(private readonly vencidos: VencidosService) {}

  @Post('marcar')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Ejecutar a mano el marcado de préstamos vencidos (RN-06)',
    description:
      'Exclusivo del Administrador, para pruebas y demostraciones. Es idempotente; el proceso automático corre a las 00:05 (Lima).',
  })
  @ApiOkResponse({ type: MarcadoVencidosResponseDto })
  @ApiForbiddenResponse({ description: 'Solo el Administrador' })
  async marcar(): Promise<MarcadoVencidosResponseDto> {
    return { marcados: await this.vencidos.marcar() };
  }
}
