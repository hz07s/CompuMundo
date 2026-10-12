import axios from 'axios'

/**
 * Cliente HTTP de la API. withCredentials envía la cookie httpOnly del
 * refresh token (P-17); el access token se agrega en ST-10.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
})
