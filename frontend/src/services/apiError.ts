import axios from 'axios'

/** Cuerpo de error de la API (filtro global del backend). */
export interface ApiErrorBody {
  statusCode: number
  message: string | string[]
  errors?: Record<string, string[]>
}

export interface ErrorNormalizado {
  status: number | null
  mensaje: string
  /** Primer mensaje de cada campo con error de validación. */
  campos: Record<string, string>
}

export function normalizarError(error: unknown): ErrorNormalizado {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    if (!error.response) {
      return {
        status: null,
        mensaje: 'No se pudo conectar con el servidor. Intente de nuevo.',
        campos: {},
      }
    }
    const { status, data } = error.response
    const campos = Object.fromEntries(
      Object.entries(data?.errors ?? {}).map(([campo, mensajes]) => [
        campo,
        mensajes[0],
      ]),
    )
    const mensaje = Array.isArray(data?.message)
      ? data.message[0]
      : (data?.message ?? 'Ocurrió un error inesperado')
    return { status, mensaje, campos }
  }
  return { status: null, mensaje: 'Ocurrió un error inesperado', campos: {} }
}
