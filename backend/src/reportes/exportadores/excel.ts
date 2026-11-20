import ExcelJS from 'exceljs';
import { MorosidadResponseDto } from '../dto/morosidad.dto';
import {
  COLUMNAS_MOROSIDAD,
  lineaGenerado,
  SIN_VENCIDOS,
  TITULO_MOROSIDAD,
} from './columnas';

export const CONTENT_TYPE_XLSX =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** HU-006 #2: genera el .xlsx con el mismo contenido que la pantalla. */
export async function generarExcelMorosidad(
  reporte: MorosidadResponseDto,
): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet('Morosidad');
  hoja.mergeCells(1, 1, 1, COLUMNAS_MOROSIDAD.length);
  hoja.getCell(1, 1).value = TITULO_MOROSIDAD;
  hoja.getCell(1, 1).font = { bold: true, size: 14 };
  hoja.mergeCells(2, 1, 2, COLUMNAS_MOROSIDAD.length);
  hoja.getCell(2, 1).value = lineaGenerado(reporte);

  if (reporte.total === 0) {
    hoja.getCell(4, 1).value = SIN_VENCIDOS;
    return Buffer.from(await libro.xlsx.writeBuffer());
  }

  const encabezado = hoja.getRow(4);
  COLUMNAS_MOROSIDAD.forEach((c, i) => {
    encabezado.getCell(i + 1).value = c.encabezado;
    hoja.getColumn(i + 1).width = c.ancho;
  });
  encabezado.font = { bold: true };

  reporte.filas.forEach((fila, i) => {
    const row = hoja.getRow(5 + i);
    COLUMNAS_MOROSIDAD.forEach((c, j) => {
      row.getCell(j + 1).value = c.valor(fila);
    });
  });
  return Buffer.from(await libro.xlsx.writeBuffer());
}
