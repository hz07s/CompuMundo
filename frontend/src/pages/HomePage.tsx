import { useEffect, useState } from 'react'
import { getHealth } from '../services/healthService'

type ApiState = 'cargando' | 'conectada' | 'sin conexión'

export default function HomePage() {
  const [apiState, setApiState] = useState<ApiState>('cargando')

  useEffect(() => {
    getHealth()
      .then((health) =>
        setApiState(health.status === 'ok' ? 'conectada' : 'sin conexión'),
      )
      .catch(() => setApiState('sin conexión'))
  }, [])

  return (
    <main className="page">
      <h1>CompuMundo CEDIS</h1>
      <p>Sistema de biblioteca</p>
      <p>
        API: <strong data-testid="api-state">{apiState}</strong>
      </p>
    </main>
  )
}
