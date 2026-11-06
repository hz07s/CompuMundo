import type { CategoriaLector } from '../lectores/types'

export type EstadoMorosidad = 'LIBRE' | 'ADVERTENCIA' | 'BLOQUEADO'

/** Lector en la verificación presencial: único contexto con el DNI completo (RNF-02). */
export interface LectorVerificacion {
  id: string
  dni: string
  nombres: string
  apellidos: string
  categoria: CategoriaLector
  esMenor: boolean
  apoderadoNombre: string | null
  apoderadoDni: string | null
  activo: boolean
  /** Tiene un préstamo Vigente o Vencido (RN-08). */
  tienePrestamoActivo: boolean
  morosidad: {
    estado: EstadoMorosidad
    devolucionesTardias: number
    mensaje: string | null
  }
}

export interface EjemplarConsulta {
  id: string
  codigo: string
  estado: 'DISPONIBLE' | 'PRESTADO'
  disponible: boolean
  obra: { id: string; titulo: string }
}

/** Cuerpo de POST /prestamos. */
export interface NuevoPrestamo {
  lectorId: string
  codigoEjemplar: string
  justificacion?: string
}

export interface PrestamoRegistrado {
  id: string
  estado: 'VIGENTE' | 'VENCIDO' | 'DEVUELTO'
  /** AAAA-MM-DD */
  fechaPrestamo: string
  /** AAAA-MM-DD: fecha del préstamo + 3 días hábiles (RN-01). */
  fechaDevolucion: string
  justificacion: string | null
  ejemplar: { codigo: string; titulo: string }
  /** El DNI llega enmascarado. */
  lector: { nombres: string; apellidos: string; dni: string }
}

/** AAAA-MM-DD → DD/MM/AAAA, sin pasar por zonas horarias. */
export function formatearFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio}`
}
