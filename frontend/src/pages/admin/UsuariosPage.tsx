import { useEffect, useState } from 'react'
import { api } from '../../services/api'
import { normalizarError } from '../../services/apiError'
import type { Rol } from '../../features/auth/types'

interface UsuarioListado {
  id: string
  nombreUsuario: string
  rol: Rol
  activo: boolean
}

/** Módulo del Administrador: personal del sistema (GET /usuarios). */
export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<UsuarioListado[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<UsuarioListado[]>('/usuarios')
      .then(({ data }) => setUsuarios(data))
      .catch((e: unknown) => setError(normalizarError(e).mensaje))
  }, [])

  return (
    <main className="page">
      <h1>Usuarios del sistema</h1>
      {error && (
        <p className="alerta" role="alert">
          {error}
        </p>
      )}
      {!usuarios && !error && <p role="status">Cargando…</p>}
      {usuarios && (
        <table className="tabla">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id}>
                <td>{u.nombreUsuario}</td>
                <td>{u.rol}</td>
                <td>{u.activo ? 'Activo' : 'Inactivo'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  )
}
