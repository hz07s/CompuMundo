import axios from 'axios'
import { api } from '../../services/api'
import type { ReporteMorosidad } from './types'

/**
 * Con responseType 'blob' el cuerpo de un error también llega como Blob, y
 * normalizarError no podría leer el mensaje del servidor (D-02). Si es JSON,
 * se reemplaza por el objeto ya parseado antes de relanzar el error.
 */
async function descargar(ruta: string): Promise<Blob> {
  try {
    const { data } = await api.get<Blob>(ruta, { responseType: 'blob' })
    return data
  } catch (error) {
    const respuesta = axios.isAxiosError(error) ? error.response : undefined
    if (respuesta?.data instanceof Blob) {
      try {
        respuesta.data = JSON.parse(await leerTexto(respuesta.data))
      } catch {
        // Cuerpo no JSON: queda el mensaje genérico de normalizarError.
      }
    }
    throw error
  }
}

function leerTexto(blob: Blob): Promise<string> {
  if (typeof blob.text === 'function') return blob.text()
  return new Promise((resolve, reject) => {
    const lector = new FileReader()
    lector.onload = () => resolve(String(lector.result))
    lector.onerror = () => reject(lector.error)
    lector.readAsText(blob)
  })
}

export const reportesApi = {
  async morosidad() {
    const { data } = await api.get<ReporteMorosidad>('/reportes/morosidad')
    return data
  },

  /** HU-006 #3: descarga el .pdf como blob. */
  morosidadPdf: () => descargar('/reportes/morosidad.pdf'),

  /** HU-006 #2: descarga el .xlsx como blob. */
  morosidadExcel: () => descargar('/reportes/morosidad.xlsx'),
}
