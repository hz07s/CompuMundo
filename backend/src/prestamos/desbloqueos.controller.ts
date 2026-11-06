import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
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
import {
  DesbloquearLectorDto,
  DesbloqueoResponseDto,
} from './dto/desbloqueo.dto';
import { MorosidadService } from './morosidad.service';

@ApiTags('lectores')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Sin token o token vencido' })
@Roles(Rol.ADMINISTRADOR)
@Controller('lectores')
export class DesbloqueosController {
  constructor(private readonly morosidad: MorosidadService) {}

  @Post(':id/desbloqueo')
  @ApiOperation({
    summary: 'Desbloquear a un lector bloqueado por morosidad (RN-02)',
    description:
      'Exclusivo del Administrador. Queda registrado con su usuario y la marca temporal; las devoluciones tardías anteriores dejan de contar.',
  })
  @ApiCreatedResponse({ type: DesbloqueoResponseDto })
  @ApiBadRequestResponse({ description: 'Falta el motivo del desbloqueo' })
  @ApiNotFoundResponse({ description: 'El lector no existe' })
  @ApiConflictResponse({ description: 'El lector no está bloqueado' })
  async desbloquear(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DesbloquearLectorDto,
    @UsuarioActual() administrador: UsuarioAutenticado,
  ): Promise<DesbloqueoResponseDto> {
    const {
      lectorId,
      motivo,
      desbloqueadoPor,
      creadoEn,
      id: desbloqueoId,
    } = await this.morosidad.desbloquear(id, dto.motivo, administrador);
    return {
      id: desbloqueoId,
      lectorId,
      motivo,
      desbloqueadoPor,
      creadoEn,
    };
  }
}
