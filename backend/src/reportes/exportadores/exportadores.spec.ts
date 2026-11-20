import ExcelJS from 'exceljs';
import { MorosidadResponseDto } from '../dto/morosidad.dto';
import { generarExcelMorosidad } from './excel';
import { generarPdfMorosidad } from './pdf';

const reporte = (
  filas: MorosidadResponseDto['filas'],
): MorosidadResponseDto => ({
  generadoEn: '2026-11-20T15:00:00.000Z',
  total: filas.length,
  filas,
});

const fila = {
  codigoEjemplar: 'CEDIS-2026-000001',
  titulo: 'Cálculo',
  lector: 'Ana Quispe',
  dni: '****8912',
  fechaPrestamo: '2026-11-02',
  fechaDevolucion: '2026-11-05',
  diasAtraso: 15,
  registradoPor: null,
};

const leer = async (buffer: Buffer) => {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(buffer as unknown as ArrayBuffer);
  return libro.getWorksheet('Morosidad')!;
};

describe('Exportadores del reporte de morosidad (HU-006)', () => {
  it('HU-006 #2 el Excel usa los encabezados y formatos de la pantalla', async () => {
    const hoja = await leer(await generarExcelMorosidad(reporte([fila])));

    expect(hoja.getRow(4).getCell(6).value).toBe('Fecha de devolución pactada');
    expect((hoja.getRow(5).values as unknown[]).slice(1)).toEqual([
      'CEDIS-2026-000001',
      'Cálculo',
      'Ana Quispe',
      '****8912',
      '02/11/2026',
      '05/11/2026',
      15,
      '—',
    ]);
    expect(hoja.getCell(2, 1).value).toContain('Total: 1');
  });

  it('HU-006 #5 el Excel vacío indica que no hay préstamos vencidos', async () => {
    const hoja = await leer(await generarExcelMorosidad(reporte([])));

    expect(hoja.getCell(4, 1).value).toBe('No hay préstamos vencidos');
  });

  it('HU-006 #3 el PDF se genera con y sin filas', async () => {
    for (const filas of [[fila], []]) {
      const pdf = await generarPdfMorosidad(reporte(filas));
      expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    }
  });
});
