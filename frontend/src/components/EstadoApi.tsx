import { useEffect, useState } from 'react'
import { getHealth } from '../services/healthService'

type ApiState = 'cargando' | 'conectada' | 'sin conexión'

/** Indicador del estado de la API (GET /health). */
export default function EstadoApi() {
  const [apiState, setApiState] = useState<ApiState>('cargando')

  useEffect(() => {
    getHealth()
      .then((health) =>
        setApiState(health.status === 'ok' ? 'conectada' : 'sin conexión'),
      )
      .catch(() => setApiState('sin conexión'))
  }, [])

  return (
    <p className="estado-api">
      API: <strong data-testid="api-state">{apiState}</strong>
    </p>
  )
}
