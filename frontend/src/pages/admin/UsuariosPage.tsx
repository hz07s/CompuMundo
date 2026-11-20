import { useEffect, useState } from 'react'
import { useAuth } from '../../features/auth/useAuth'
import NuevaCuentaForm from '../../features/usuarios/NuevaCuentaForm'
import TablaCuentas from '../../features/usuarios/TablaCuentas'
import type { Cuenta } from '../../features/usuarios/types'
import { usuariosApi } from '../../features/usuarios/usuariosApi'
import { normalizarError } from '../../services/apiError'

/** Módulo del Administrador: cuentas del personal (HU-021, ST-08). */
export default function UsuariosPage() {
  const { sesion } = useAuth()
  const [cuentas, setCuentas] = useState<Cuenta[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const idPropio = sesion.estado === 'autenticado' ? sesion.usuario.id : ''

  useEffect(() => {
    usuariosApi
      .listar()
      .then(setCuentas)
      .catch((e: unknown) => setError(normalizarError(e).mensaje))
  }, [])

  function agregar(cuenta: Cuenta) {
    setCuentas((lista) =>
      [...(lista ?? []), cuenta].sort((a, b) =>
        a.nombreUsuario.localeCompare(b.nombreUsuario),
      ),
    )
    setAviso(`Cuenta ${cuenta.nombreUsuario} creada. Ya puede iniciar sesión.`)
  }

  function reemplazar(cuenta: Cuenta, mensaje: string) {
    setCuentas((lista) =>
      (lista ?? []).map((c) => (c.id === cuenta.id ? cuenta : c)),
    )
    setAviso(mensaje)
  }

  return (
    <main className="page">
      <h1>Usuarios del sistema</h1>
      <p className="subtitulo">
        Cree las cuentas del personal y deshabilite las que ya no se usan.
      </p>
      {aviso && (
        <p className="exito" role="status">
          {aviso}
        </p>
      )}
      <div className="catalogo">
        <section aria-label="Cuentas del personal">
          {error && (
            <p className="alerta" role="alert">
              {error}
            </p>
          )}
          {!cuentas && !error && <p role="status">Cargando…</p>}
          {cuentas && (
            <TablaCuentas
              cuentas={cuentas}
              idPropio={idPropio}
              onActualizada={reemplazar}
            />
          )}
        </section>
        <NuevaCuentaForm onCreada={agregar} />
      </div>
    </main>
  )
}
