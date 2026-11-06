import { api } from '../../services/api'
import type { LectorRegistrado, NuevoLector } from './types'

export const lectoresApi = {
  async crear(lector: NuevoLector) {
    const { data } = await api.post<LectorRegistrado>('/lectores', lector)
    return data
  },
}
