import { api } from '../../services/api'
import type { NuevaObra, ObraDetalle, ObrasPaginadas } from './types'

export const obrasApi = {
  async crear(obra: NuevaObra) {
    const { data } = await api.post<ObraDetalle>('/obras', obra)
    return data
  },

  async listar(page: number, limit: number) {
    const { data } = await api.get<ObrasPaginadas>('/obras', {
      params: { page, limit },
    })
    return data
  },
}
