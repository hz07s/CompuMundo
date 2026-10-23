export type EstadoEjemplar = 'DISPONIBLE' | 'PRESTADO'

export interface Ejemplar {
  id: string
  codigo: string
  estado: EstadoEjemplar
}

export interface ObraResumen {
  id: string
  titulo: string
  categoria: string
  autores: string[]
  fechaPublicacion: string
  totalEjemplares: number
  disponibilidad: number
  creadoEn: string
}

export interface ObraDetalle extends ObraResumen {
  ejemplares: Ejemplar[]
}

export interface ObrasPaginadas {
  data: ObraResumen[]
  total: number
  page: number
  limit: number
}

/** Cuerpo de POST /obras. */
export interface NuevaObra {
  titulo: string
  categoria: string
  autores: string[]
  fechaPublicacion: string
  cantidad: number
}
