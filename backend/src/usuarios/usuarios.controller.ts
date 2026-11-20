import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
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
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { UsuarioResponseDto } from './dto/usuario-response.dto';
import { Rol } from './rol.enum';
import { UsuariosService } from './usuarios.service';

@ApiTags('usuarios')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Sin token o token vencido' })
@ApiForbiddenResponse({ description: 'El rol no es Administrador' })
@Roles(Rol.ADMINISTRADOR)
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar el personal del sistema',
    description: 'Exclusivo del Administrador (ST-08, HU-021).',
  })
  @ApiOkResponse({ type: [UsuarioResponseDto] })
  listar(): Promise<UsuarioResponseDto[]> {
    return this.usuarios.listar();
  }

  @Post()
  @ApiOperation({
    summary: 'Crear una cuenta del personal (HU-021)',
    description:
      'Alta de un Bibliotecario o Administrador con contraseña inicial. El correo es opcional y habilita el inicio de sesión con Google.',
  })
  @ApiCreatedResponse({ type: UsuarioResponseDto })
  @ApiBadRequestResponse({
    description: 'Datos inválidos, agrupados por campo',
  })
  @ApiConflictResponse({ description: 'Nombre de usuario o correo repetido' })
  crear(
    @Body() dto: CrearUsuarioDto,
    @UsuarioActual() admin: UsuarioAutenticado,
  ): Promise<UsuarioResponseDto> {
    return this.usuarios.crear(dto, admin);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Cambiar rol, estado o contraseña de una cuenta (HU-021)',
    description:
      'Deshabilitar (baja lógica) o cambiar la contraseña revoca los refresh tokens de la cuenta.',
  })
  @ApiOkResponse({ type: UsuarioResponseDto })
  @ApiBadRequestResponse({ description: 'Datos inválidos o id no es UUID' })
  @ApiNotFoundResponse({ description: 'La cuenta no existe' })
  @ApiConflictResponse({
    description:
      'El Administrador intenta deshabilitarse o quitarse el rol a sí mismo',
  })
  actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarUsuarioDto,
    @UsuarioActual() admin: UsuarioAutenticado,
  ): Promise<UsuarioResponseDto> {
    return this.usuarios.actualizar(id, dto, admin);
  }
}
