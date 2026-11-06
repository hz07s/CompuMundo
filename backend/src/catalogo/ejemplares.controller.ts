import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { Rol } from '../usuarios/rol.enum';
import { EjemplarConsultaDto } from './dto/ejemplar-consulta.dto';
import { EjemplaresService } from './ejemplares.service';

@ApiTags('ejemplares')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Sin token o token vencido' })
@Roles(Rol.BIBLIOTECARIO, Rol.ADMINISTRADOR)
@Controller('ejemplares')
export class EjemplaresController {
  constructor(private readonly ejemplares: EjemplaresService) {}

  @Get(':codigo')
  @ApiOperation({
    summary: 'Consultar un ejemplar por su código y su disponibilidad',
    description:
      'Verificación rápida antes de prestar (HU-004). El código tiene el formato CEDIS-AAAA-NNNNNN.',
  })
  @ApiOkResponse({ type: EjemplarConsultaDto })
  @ApiNotFoundResponse({ description: 'No existe un ejemplar con ese código' })
  consultar(@Param('codigo') codigo: string): Promise<EjemplarConsultaDto> {
    return this.ejemplares.consultar(codigo);
  }
}
