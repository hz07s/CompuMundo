import axios from 'axios'
import type { SesionResponse } from './types'

/**
 * Cliente sin interceptores para /auth: así un 401 del refresh no dispara
 * otro refresh. withCredentials envía y recibe la cookie del refresh token.
 */
export const authHttp = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
})

export const authApi = {
  async login(nombreUsuario: string, password: string) {
    const { data } = await authHttp.post<SesionResponse>('/auth/login', {
      nombreUsuario,
      password,
    })
    return data
  },

  async refresh() {
    const { data } = await authHttp.post<SesionResponse>('/auth/refresh')
    return data
  },

  async logout() {
    await authHttp.post('/auth/logout')
  },
}
