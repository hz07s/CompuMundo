import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Rol } from '../usuarios/rol.enum';
import { CantidadEjemplaresDto, CrearObraDto } from './dto/crear-obra.dto';
import { ObraDetalleDto, ObrasPaginadasDto } from './dto/obra-response.dto';
import { ObrasService } from './obras.service';

@ApiTags('obras')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Sin token o token vencido' })
@Roles(Rol.BIBLIOTECARIO)
@Controller('obras')
export class ObrasController {
  constructor(private readonly obras: ObrasService) {}

  @Post()
  @ApiOperation({
    summary: 'Registrar una obra con sus ejemplares',
    description:
      'Crea la obra y N ejemplares en una transacción. Cada ejemplar recibe un código CEDIS-AAAA-NNNNNN.',
  })
  @ApiCreatedResponse({ type: ObraDetalleDto })
  @ApiBadRequestResponse({
    description:
      'Campos faltantes o inválidos, agrupados por campo en `errors`',
  })
  crear(@Body() dto: CrearObraDto): Promise<ObraDetalleDto> {
    return this.obras.crear(dto);
  }

  @Post(':id/ejemplares')
  @ApiOperation({ summary: 'Agregar ejemplares a una obra existente' })
  @ApiCreatedResponse({ type: ObraDetalleDto })
  @ApiBadRequestResponse({ description: 'Cantidad inválida' })
  @ApiNotFoundResponse({ description: 'La obra no existe o está dada de baja' })
  agregarEjemplares(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CantidadEjemplaresDto,
  ): Promise<ObraDetalleDto> {
    return this.obras.agregarEjemplares(id, dto.cantidad);
  }

  @Get()
  @ApiOperation({ summary: 'Listar obras (paginado, más recientes primero)' })
  @ApiOkResponse({ type: ObrasPaginadasDto })
  listar(@Query() query: PaginationQueryDto): Promise<ObrasPaginadasDto> {
    return this.obras.listar(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de una obra con sus ejemplares' })
  @ApiOkResponse({ type: ObraDetalleDto })
  @ApiNotFoundResponse({ description: 'La obra no existe o está dada de baja' })
  detalle(@Param('id', ParseUUIDPipe) id: string): Promise<ObraDetalleDto> {
    return this.obras.detalle(id);
  }
}
