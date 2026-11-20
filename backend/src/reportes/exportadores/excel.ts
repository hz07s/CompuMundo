import ExcelJS from 'exceljs';
import { MorosidadResponseDto } from '../dto/morosidad.dto';

export const CONTENT_TYPE_XLSX =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Columnas de P-18, en el mismo orden que la pantalla. */
export const COLUMNAS_MOROSIDAD = [
  { encabezado: 'Código del ejemplar', clave: 'codigoEjemplar', ancho: 22 },
  { encabezado: 'Título de la obra', clave: 'titulo', ancho: 36 },
  { encabezado: 'Lector', clave: 'lector', ancho: 30 },
  { encabezado: 'DNI', clave: 'dni', ancho: 12 },
  { encabezado: 'Fecha de préstamo', clave: 'fechaPrestamo', ancho: 18 },
  {
    encabezado: 'Fecha de devolución pactada',
    clave: 'fechaDevolucion',
    ancho: 26,
  },
  { encabezado: 'Días de atraso', clave: 'diasAtraso', ancho: 14 },
  { encabezado: 'Registrado por', clave: 'registradoPor', ancho: 18 },
] as const;

/** HU-006 #2: genera el .xlsx con el mismo contenido que la pantalla. */
export async function generarExcelMorosidad(
  reporte: MorosidadResponseDto,
): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet('Morosidad');
  hoja.mergeCells(1, 1, 1, COLUMNAS_MOROSIDAD.length);
  hoja.getCell(1, 1).value = 'Reporte de morosidad · CompuMundo CEDIS';
  hoja.getCell(1, 1).font = { bold: true, size: 14 };
  hoja.mergeCells(2, 1, 2, COLUMNAS_MOROSIDAD.length);
  hoja.getCell(2, 1).value =
    `Generado: ${reporte.generadoEn} · Total: ${reporte.total}`;

  const encabezado = hoja.getRow(4);
  COLUMNAS_MOROSIDAD.forEach((c, i) => {
    encabezado.getCell(i + 1).value = c.encabezado;
    hoja.getColumn(i + 1).width = c.ancho;
  });
  encabezado.font = { bold: true };

  reporte.filas.forEach((fila, i) => {
    const row = hoja.getRow(5 + i);
    COLUMNAS_MOROSIDAD.forEach((c, j) => {
      row.getCell(j + 1).value = fila[c.clave];
    });
  });
  return Buffer.from(await libro.xlsx.writeBuffer());
}
