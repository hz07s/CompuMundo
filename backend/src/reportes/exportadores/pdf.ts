import PDFDocument from 'pdfkit';
import { MorosidadResponseDto } from '../dto/morosidad.dto';

export const CONTENT_TYPE_PDF = 'application/pdf';

const COLUMNAS = [
  { titulo: 'Código', ancho: 100, valor: (f: Fila) => f.codigoEjemplar },
  { titulo: 'Título', ancho: 170, valor: (f: Fila) => f.titulo },
  { titulo: 'Lector', ancho: 130, valor: (f: Fila) => f.lector },
  { titulo: 'DNI', ancho: 55, valor: (f: Fila) => f.dni },
  { titulo: 'Préstamo', ancho: 60, valor: (f: Fila) => f.fechaPrestamo },
  { titulo: 'Pactada', ancho: 60, valor: (f: Fila) => f.fechaDevolucion },
  { titulo: 'Atraso', ancho: 40, valor: (f: Fila) => String(f.diasAtraso) },
  { titulo: 'Registró', ancho: 70, valor: (f: Fila) => f.registradoPor ?? '—' },
];

type Fila = MorosidadResponseDto['filas'][number];

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

    doc
      .font('Helvetica-Bold')
      .fontSize(14)
      .text('Reporte de morosidad · CompuMundo CEDIS');
    doc
      .font('Helvetica')
      .fontSize(9)
      .text(`Generado: ${reporte.generadoEn} · Total: ${reporte.total}`);
    doc.moveDown();

    if (reporte.total === 0) {
      doc.text('No hay préstamos vencidos');
    } else {
      const fila = (celdas: string[], negrita: boolean) => {
        if (doc.y > doc.page.height - 50) doc.addPage();
        const y = doc.y;
        let x = doc.page.margins.left;
        doc.font(negrita ? 'Helvetica-Bold' : 'Helvetica').fontSize(8);
        celdas.forEach((c, i) => {
          doc.text(c, x, y, {
            width: COLUMNAS[i].ancho - 4,
            height: 10,
            lineBreak: false,
            ellipsis: true,
          });
          x += COLUMNAS[i].ancho;
        });
        doc.y = y + 13;
      };
      fila(
        COLUMNAS.map((c) => c.titulo),
        true,
      );
      for (const f of reporte.filas) {
        fila(
          COLUMNAS.map((c) => c.valor(f)),
          false,
        );
      }
    }
    doc.end();
  });
}
