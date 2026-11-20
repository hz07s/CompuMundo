import { api } from '../../services/api'
import type { ReporteMorosidad } from './types'

export const reportesApi = {
  async morosidad() {
    const { data } = await api.get<ReporteMorosidad>('/reportes/morosidad')
    return data
  },

  /** HU-006 #3: descarga el .pdf como blob. */
  async morosidadPdf() {
    const { data } = await api.get<Blob>('/reportes/morosidad.pdf', {
      responseType: 'blob',
    })
    return data
  },

  /** HU-006 #2: descarga el .xlsx como blob. */
  async morosidadExcel() {
    const { data } = await api.get<Blob>('/reportes/morosidad.xlsx', {
      responseType: 'blob',
    })
    return data
  },
}
