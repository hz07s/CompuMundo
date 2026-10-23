import axios, { type InternalAxiosRequestConfig } from 'axios'
import { renovarSesion } from '../features/auth/renovarSesion'
import { sesionStore } from '../features/auth/sesionStore'

/** Cliente HTTP de la API: agrega el access token y renueva la sesión ante un 401. */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = sesionStore.accessToken()
  // Un reintento tras renovar la sesión ya trae su header; no se pisa.
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

type ConfigReintentable = InternalAxiosRequestConfig & { _reintento?: boolean }

api.interceptors.response.use(undefined, async (error: unknown) => {
  if (!axios.isAxiosError(error) || error.response?.status !== 401) {
    throw error
  }
  const original = error.config as ConfigReintentable | undefined
  // Un solo reintento por petición: si el token nuevo también da 401, no hay bucle.
  if (!original || original._reintento) throw error

  original._reintento = true
  const token = await renovarSesion()
  if (!token) throw error

  original.headers.Authorization = `Bearer ${token}`
  return api(original)
})
