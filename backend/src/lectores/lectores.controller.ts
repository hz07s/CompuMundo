import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { UsuarioAutenticado } from '../auth/auth.types';
import { Roles } from '../auth/decorators/roles.decorator';
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator';
import { Rol } from '../usuarios/rol.enum';
import { CrearLectorDto } from './dto/crear-lector.dto';
import { LectorResponseDto } from './dto/lector-response.dto';
import { LectoresService } from './lectores.service';

@ApiTags('lectores')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Sin token o token vencido' })
@ApiForbiddenResponse({ description: 'El rol no puede registrar lectores' })
@Roles(Rol.BIBLIOTECARIO)
@Controller('lectores')
export class LectoresController {
  constructor(private readonly lectores: LectoresService) {}

  @Post()
  @ApiOperation({
    summary: 'Registrar un lector',
    description:
      'Valida el DNI (8 dígitos) y que no exista ya. Si el lector es menor de 18 años exige DNI y nombre del apoderado y su consentimiento firmado (RN-09). La respuesta devuelve el DNI enmascarado.',
  })
  @ApiCreatedResponse({ type: LectorResponseDto })
  @ApiBadRequestResponse({
    description:
      'Campos faltantes o inválidos, DNI con formato incorrecto o menor sin apoderado; agrupados por campo en `errors`',
  })
  @ApiConflictResponse({ description: 'El DNI ya está registrado' })
  crear(
    @Body() dto: CrearLectorDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<LectorResponseDto> {
    return this.lectores.crear(dto, usuario);
  }
}
