import { api } from './api'

export interface HealthResponse {
  status: 'ok' | 'error'
  info?: Record<string, { status: string }>
}

export async function getHealth(): Promise<HealthResponse> {
  const { data } = await api.get<HealthResponse>('/health')
  return data
}
