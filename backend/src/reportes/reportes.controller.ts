import { Controller, Get, Header, StreamableFile } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { Rol } from '../usuarios/rol.enum';
import { MorosidadResponseDto } from './dto/morosidad.dto';
import { CONTENT_TYPE_XLSX, generarExcelMorosidad } from './exportadores/excel';
import { hoyEnLima } from '../prestamos/dias-habiles.service';
import { ReportesService } from './reportes.service';

@ApiTags('reportes')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Sin token o token vencido' })
@ApiForbiddenResponse({ description: 'Rol sin acceso' })
@Roles(Rol.BIBLIOTECARIO, Rol.ADMINISTRADOR)
@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportes: ReportesService) {}

  @Get('morosidad')
  @ApiOperation({
    summary: 'Reporte de préstamos vencidos (HU-006)',
    description:
      'Marca los vencidos antes de consultar (RN-06b). DNI siempre enmascarado. Orden: más días de atraso primero.',
  })
  @ApiOkResponse({ type: MorosidadResponseDto })
  morosidad(): Promise<MorosidadResponseDto> {
    return this.reportes.morosidad();
  }

  @Get('morosidad.xlsx')
  @Header('Content-Type', CONTENT_TYPE_XLSX)
  @ApiOperation({
    summary: 'Exportar el reporte de morosidad a Excel (HU-006 #2)',
    description: 'Mismo contenido que GET /reportes/morosidad.',
  })
  @ApiOkResponse({ description: 'Archivo .xlsx' })
  async morosidadExcel(): Promise<StreamableFile> {
    const archivo = await generarExcelMorosidad(
      await this.reportes.morosidad(),
    );
    return new StreamableFile(archivo, {
      type: CONTENT_TYPE_XLSX,
      disposition: `attachment; filename="morosidad-${hoyEnLima()}.xlsx"`,
    });
  }
}
