import PDFDocument from 'pdfkit';
import { MorosidadResponseDto } from '../dto/morosidad.dto';
import {
  COLUMNAS_MOROSIDAD,
  lineaGenerado,
  SIN_VENCIDOS,
  TITULO_MOROSIDAD,
} from './columnas';

export const CONTENT_TYPE_PDF = 'application/pdf';

/** HU-006 #3: tabla simple en A4 horizontal con las mismas filas que la pantalla. */
export function generarPdfMorosidad(
  reporte: MorosidadResponseDto,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 30,
    });
    const trozos: Buffer[] = [];
    doc.on('data', (t: Buffer) => trozos.push(t));
    doc.on('end', () => resolve(Buffer.concat(trozos)));
    doc.on('error', reject);

    doc.font('Helvetica-Bold').fontSize(14).text(TITULO_MOROSIDAD);
    doc.font('Helvetica').fontSize(9).text(lineaGenerado(reporte));
    doc.moveDown();

    if (reporte.total === 0) {
      doc.text(SIN_VENCIDOS);
    } else {
      // Reparte el ancho útil en proporción a los anchos de Excel.
      const util =
        doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const suma = COLUMNAS_MOROSIDAD.reduce((s, c) => s + c.ancho, 0);
      const anchos = COLUMNAS_MOROSIDAD.map((c) => (c.ancho * util) / suma);

      const fila = (celdas: string[], negrita: boolean) => {
        const alto = negrita ? 22 : 13;
        if (doc.y > doc.page.height - 50) doc.addPage();
        const y = doc.y;
        let x = doc.page.margins.left;
        doc.font(negrita ? 'Helvetica-Bold' : 'Helvetica').fontSize(8);
        celdas.forEach((c, i) => {
          doc.text(c, x, y, {
            width: anchos[i] - 4,
            height: alto - 2,
            lineBreak: negrita,
            ellipsis: true,
          });
          x += anchos[i];
        });
        doc.y = y + alto;
      };
      fila(
        COLUMNAS_MOROSIDAD.map((c) => c.encabezado),
        true,
      );
      for (const f of reporte.filas) {
        fila(
          COLUMNAS_MOROSIDAD.map((c) => String(c.valor(f))),
          false,
        );
      }
    }
    doc.end();
  });
}
