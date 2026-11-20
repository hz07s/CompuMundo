/** Fila del reporte de morosidad (HU-006, P-18). El DNI llega siempre enmascarado. */
export interface FilaMorosidad {
  codigoEjemplar: string
  titulo: string
  lector: string
  dni: string
  fechaPrestamo: string
  fechaDevolucion: string
  diasAtraso: number
  registradoPor: string | null
}

export interface ReporteMorosidad {
  generadoEn: string
  total: number
  filas: FilaMorosidad[]
}
