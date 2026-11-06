import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { UsuarioAutenticado } from '../auth/auth.types';
import { Roles } from '../auth/decorators/roles.decorator';
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator';
import { Rol } from '../usuarios/rol.enum';
import { CrearPrestamoDto, PrestamoResponseDto } from './dto/prestamo.dto';
import { PrestamosService } from './prestamos.service';

@ApiTags('prestamos')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Sin token o token vencido' })
@Roles(Rol.BIBLIOTECARIO)
@Controller('prestamos')
export class PrestamosController {
  constructor(private readonly prestamos: PrestamosService) {}

  @Post()
  @ApiOperation({
    summary: 'Registrar un préstamo',
    description:
      'Valida el ejemplar (disponible), el lector (registrado), RN-08 (un solo préstamo activo) y RN-02 (morosidad: advertencia con justificación o bloqueo). Calcula la fecha de devolución (3 días hábiles, RN-01), deja el ejemplar como prestado y guarda al usuario responsable.',
  })
  @ApiCreatedResponse({ type: PrestamoResponseDto })
  @ApiBadRequestResponse({
    description:
      'Datos inválidos, o falta la justificación escrita cuando hay advertencia por morosidad (RN-02)',
  })
  @ApiNotFoundResponse({
    description: 'El ejemplar o el lector no están registrados',
  })
  @ApiConflictResponse({
    description:
      'Ejemplar no disponible, lector con un préstamo activo (RN-08) o bloqueado por morosidad (RN-02)',
  })
  registrar(
    @Body() dto: CrearPrestamoDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<PrestamoResponseDto> {
    return this.prestamos.registrar(dto, usuario);
  }
}
