export const CATEGORIAS_LECTOR = [
  'ESTUDIANTE',
  'DOCENTE',
  'ADMINISTRATIVO',
] as const

export type CategoriaLector = (typeof CATEGORIAS_LECTOR)[number]

export const NOMBRE_CATEGORIA: Record<CategoriaLector, string> = {
  ESTUDIANTE: 'Estudiante',
  DOCENTE: 'Docente',
  ADMINISTRATIVO: 'Administrativo',
}

/** Cuerpo de POST /lectores. */
export interface NuevoLector {
  dni: string
  nombres: string
  apellidos: string
  categoria: CategoriaLector
  fechaNacimiento: string
  apoderadoDni?: string
  apoderadoNombre?: string
  consentimientoApoderado?: boolean
}

/** Respuesta del alta: el DNI llega siempre enmascarado (RNF-02). */
export interface LectorRegistrado {
  id: string
  dni: string
  nombres: string
  apellidos: string
  categoria: CategoriaLector
  fechaNacimiento: string
  esMenor: boolean
  apoderadoNombre: string | null
  apoderadoDni: string | null
  consentimientoApoderado: boolean
  activo: boolean
  creadoEn: string
}
