import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { UsuarioResponseDto } from './dto/usuario-response.dto';
import { Rol } from './rol.enum';
import { UsuariosService } from './usuarios.service';

@ApiTags('usuarios')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Sin token o token vencido' })
@Roles(Rol.ADMINISTRADOR)
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar el personal del sistema',
    description:
      'Exclusivo del Administrador (ejemplo de restricción por rol, ST-08).',
  })
  @ApiOkResponse({ type: [UsuarioResponseDto] })
  listar(): Promise<UsuarioResponseDto[]> {
    return this.usuarios.listar();
  }
}
