import { Fragment, useState, type FormEvent } from 'react'
import { normalizarError } from '../../services/apiError'
import { NOMBRE_ROL, type CambiosCuenta, type Cuenta } from './types'
import { usuariosApi } from './usuariosApi'
import { validarClave } from './validarCuenta'

type Accion =
  | { tipo: 'confirmar'; cuenta: Cuenta; cambios: CambiosCuenta; texto: string }
  | { tipo: 'clave'; cuenta: Cuenta }

interface Props {
  cuentas: Cuenta[]
  /** Id del Administrador con sesión: no puede bloquearse a sí mismo (HU-021 #5). */
  idPropio: string
  onActualizada: (cuenta: Cuenta, aviso: string) => void
}

/** Listado de cuentas con acciones por fila; las acciones sensibles piden confirmación. */
export default function TablaCuentas({
  cuentas,
  idPropio,
  onActualizada,
}: Props) {
  const [accion, setAccion] = useState<Accion | null>(null)
  const [clave, setClave] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  function abrir(nueva: Accion) {
    setAccion(nueva)
    setClave('')
    setError(null)
  }

  async function aplicar(
    cuenta: Cuenta,
    cambios: CambiosCuenta,
    aviso: string,
  ) {
    setGuardando(true)
    setError(null)
    try {
      onActualizada(await usuariosApi.actualizar(cuenta.id, cambios), aviso)
      setAccion(null)
    } catch (err) {
      setError(normalizarError(err).mensaje)
    } finally {
      setGuardando(false)
    }
  }

  async function guardarClave(e: FormEvent, cuenta: Cuenta) {
    e.preventDefault()
    const invalida = validarClave(clave)
    if (invalida) return setError(invalida)
    await aplicar(
      cuenta,
      { password: clave },
      `Contraseña de ${cuenta.nombreUsuario} actualizada; sus sesiones abiertas se cerrarán.`,
    )
  }

  function acciones(c: Cuenta) {
    const propia = c.id === idPropio
    const otroRol =
      c.rol === 'ADMINISTRADOR' ? 'BIBLIOTECARIO' : 'ADMINISTRADOR'
    return (
      <div className="acciones-fila">
        {c.activo ? (
          <button
            type="button"
            className="boton-texto peligro"
            disabled={propia}
            title={
              propia ? 'No puede deshabilitar su propia cuenta' : undefined
            }
            onClick={() =>
              abrir({
                tipo: 'confirmar',
                cuenta: c,
                cambios: { activo: false },
                texto: `¿Deshabilitar a ${c.nombreUsuario}? No podrá iniciar sesión.`,
              })
            }
          >
            Deshabilitar
          </button>
        ) : (
          <button
            type="button"
            className="boton-texto"
            onClick={() =>
              void aplicar(
                c,
                { activo: true },
                `${c.nombreUsuario} puede volver a iniciar sesión.`,
              )
            }
          >
            Reactivar
          </button>
        )}
        <button
          type="button"
          className="boton-texto"
          disabled={propia}
          title={propia ? 'No puede cambiar su propio rol' : undefined}
          onClick={() =>
            abrir({
              tipo: 'confirmar',
              cuenta: c,
              cambios: { rol: otroRol },
              texto: `¿Cambiar el rol de ${c.nombreUsuario} a ${NOMBRE_ROL[otroRol]}?`,
            })
          }
        >
          Hacer {NOMBRE_ROL[otroRol]}
        </button>
        <button
          type="button"
          className="boton-texto"
          onClick={() => abrir({ tipo: 'clave', cuenta: c })}
        >
          Nueva contraseña
        </button>
      </div>
    )
  }

  function panel(c: Cuenta) {
    if (!accion || accion.cuenta.id !== c.id) return null
    return (
      <tr className="fila-panel">
        <td colSpan={5}>
          {accion.tipo === 'confirmar' ? (
            <div
              className="panel-accion"
              role="group"
              aria-label="Confirmar cambio"
            >
              <span>{accion.texto}</span>
              <button
                type="button"
                className="boton-primario"
                disabled={guardando}
                onClick={() =>
                  void aplicar(
                    c,
                    accion.cambios,
                    accion.cambios.activo === false
                      ? `${c.nombreUsuario} quedó deshabilitado.`
                      : `${c.nombreUsuario} ahora es ${NOMBRE_ROL[accion.cambios.rol!]}.`,
                  )
                }
              >
                Confirmar
              </button>
              <button
                type="button"
                className="boton-secundario"
                onClick={() => setAccion(null)}
              >
                Cancelar
              </button>
            </div>
          ) : (
            <form
              className="panel-accion"
              onSubmit={(e) => void guardarClave(e, c)}
              noValidate
            >
              <label htmlFor={`clave-${c.id}`}>
                Nueva contraseña para {c.nombreUsuario}
              </label>
              <input
                id={`clave-${c.id}`}
                type="password"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                autoComplete="new-password"
                maxLength={72}
                autoFocus
              />
              <button
                type="submit"
                className="boton-primario"
                disabled={guardando}
              >
                Guardar
              </button>
              <button
                type="button"
                className="boton-secundario"
                onClick={() => setAccion(null)}
              >
                Cancelar
              </button>
            </form>
          )}
          {error && (
            <p className="alerta" role="alert">
              {error}
            </p>
          )}
        </td>
      </tr>
    )
  }

  return (
    <div className="tabla-contenedor">
      <table className="tabla">
        <caption>Personal del sistema ({cuentas.length})</caption>
        <thead>
          <tr>
            <th scope="col">Usuario</th>
            <th scope="col">Rol</th>
            <th scope="col">Correo de Google</th>
            <th scope="col">Estado</th>
            <th scope="col">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {cuentas.map((c) => (
            <Fragment key={c.id}>
              <tr className={c.activo ? undefined : 'fila-inactiva'}>
                <td>
                  {c.nombreUsuario}
                  {c.id === idPropio && <span className="etiqueta">Usted</span>}
                </td>
                <td>{NOMBRE_ROL[c.rol]}</td>
                <td>{c.email ?? '—'}</td>
                <td>
                  <span className={`estado ${c.activo ? 'ok' : 'apagado'}`}>
                    {c.activo ? 'Activa' : 'Deshabilitada'}
                  </span>
                </td>
                <td>{acciones(c)}</td>
              </tr>
              {panel(c)}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
