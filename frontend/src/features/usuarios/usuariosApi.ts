import { api } from '../../services/api'
import type { CambiosCuenta, Cuenta, NuevaCuenta } from './types'

/** Cuentas del personal (HU-021). Solo el Administrador. */
export const usuariosApi = {
  async listar() {
    const { data } = await api.get<Cuenta[]>('/usuarios')
    return data
  },

  async crear(cuenta: NuevaCuenta) {
    const { data } = await api.post<Cuenta>('/usuarios', cuenta)
    return data
  },

  async actualizar(id: string, cambios: CambiosCuenta) {
    const { data } = await api.patch<Cuenta>(`/usuarios/${id}`, cambios)
    return data
  },
}
