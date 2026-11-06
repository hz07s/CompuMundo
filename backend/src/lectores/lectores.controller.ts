import { Body, Controller, Header, HttpCode, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
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
import {
  LectorVerificacionDto,
  VerificarLectorDto,
} from './dto/verificar-lector.dto';
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

  @Post('verificacion')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @Roles(Rol.BIBLIOTECARIO, Rol.ADMINISTRADOR)
  @ApiOperation({
    summary: 'Verificación presencial: datos del lector con el DNI completo',
    description:
      'Único contexto donde el DNI se devuelve completo (RNF-02), para el Bibliotecario y el Administrador. El DNI viaja en el cuerpo para no quedar en la URL ni en los logs. El DNI del apoderado sigue enmascarado.',
  })
  @ApiOkResponse({ type: LectorVerificacionDto })
  @ApiBadRequestResponse({ description: 'DNI con formato inválido' })
  @ApiNotFoundResponse({ description: 'El lector no está registrado' })
  verificar(@Body() dto: VerificarLectorDto): Promise<LectorVerificacionDto> {
    return this.lectores.verificar(dto.dni);
  }
}
