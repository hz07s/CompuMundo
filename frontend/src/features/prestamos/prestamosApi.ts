import { api } from '../../services/api'
import type {
  EjemplarConsulta,
  LectorVerificacion,
  NuevoPrestamo,
  PrestamoRegistrado,
} from './types'

export const prestamosApi = {
  /** Verificación presencial: datos del lector con el DNI completo. El DNI va en el cuerpo, no en la URL. */
  async verificarLector(dni: string) {
    const { data } = await api.post<LectorVerificacion>(
      '/lectores/verificacion',
      { dni },
    )
    return data
  },

  async consultarEjemplar(codigo: string) {
    const { data } = await api.get<EjemplarConsulta>(
      `/ejemplares/${encodeURIComponent(codigo)}`,
    )
    return data
  },

  async registrar(prestamo: NuevoPrestamo) {
    const { data } = await api.post<PrestamoRegistrado>('/prestamos', prestamo)
    return data
  },

  /** Solo el Administrador (RN-02). */
  async desbloquearLector(lectorId: string, motivo: string) {
    await api.post(`/lectores/${lectorId}/desbloqueo`, { motivo })
  },
}
