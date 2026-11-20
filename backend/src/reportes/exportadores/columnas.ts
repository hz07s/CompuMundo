import { MorosidadResponseDto } from '../dto/morosidad.dto';

type Fila = MorosidadResponseDto['filas'][number];

export const TITULO_MOROSIDAD = 'Reporte de morosidad · CompuMundo CEDIS';
export const SIN_VENCIDOS = 'No hay préstamos vencidos';

/** AAAA-MM-DD → DD/MM/AAAA, igual que la pantalla. */
export function formatearFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}`;
}

/** Línea "Generado · Total" con la hora de Lima, igual que la pantalla. */
export function lineaGenerado(reporte: MorosidadResponseDto): string {
  const generado = new Date(reporte.generadoEn).toLocaleString('es-PE', {
    timeZone: 'America/Lima',
  });
  return `Generado: ${generado} · Total: ${reporte.total}`;
}

/**
 * Columnas de P-18 en el orden y con los encabezados de la pantalla (HU-006
 * #2/#3). Excel y PDF las comparten para que el contenido sea idéntico.
 * `ancho` está en caracteres de Excel; el PDF lo reparte en proporción.
 */
export const COLUMNAS_MOROSIDAD: ReadonlyArray<{
  encabezado: string;
  ancho: number;
  valor: (f: Fila) => string | number;
}> = [
  {
    encabezado: 'Código del ejemplar',
    ancho: 22,
    valor: (f) => f.codigoEjemplar,
  },
  { encabezado: 'Título de la obra', ancho: 36, valor: (f) => f.titulo },
  { encabezado: 'Lector', ancho: 30, valor: (f) => f.lector },
  { encabezado: 'DNI', ancho: 12, valor: (f) => f.dni },
  {
    encabezado: 'Fecha de préstamo',
    ancho: 18,
    valor: (f) => formatearFecha(f.fechaPrestamo),
  },
  {
    encabezado: 'Fecha de devolución pactada',
    ancho: 26,
    valor: (f) => formatearFecha(f.fechaDevolucion),
  },
  { encabezado: 'Días de atraso', ancho: 14, valor: (f) => f.diasAtraso },
  {
    encabezado: 'Registrado por',
    ancho: 18,
    valor: (f) => f.registradoPor ?? '—',
  },
];
