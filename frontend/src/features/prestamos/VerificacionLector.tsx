import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { normalizarError } from '../../services/apiError'
import { RUTAS } from '../auth/rutas'
import type { Rol } from '../auth/types'
import { NOMBRE_CATEGORIA } from '../lectores/types'
import { prestamosApi } from './prestamosApi'
import type { LectorVerificacion } from './types'

interface Props {
  rol: Rol
  lector: LectorVerificacion | null
  justificacion: string
  errorJustificacion?: string
  onVerificado: (lector: LectorVerificacion | null) => void
  onJustificacion: (texto: string) => void
}

/** Paso 1 del préstamo: pantalla de verificación presencial del lector (DNI completo, RNF-02). */
export default function VerificacionLector({
  rol,
  lector,
  justificacion,
  errorJustificacion,
  onVerificado,
  onJustificacion,
}: Props) {
  const [dni, setDni] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [noRegistrado, setNoRegistrado] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [errorDesbloqueo, setErrorDesbloqueo] = useState<string | null>(null)

  async function verificar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setNoRegistrado(false)
    onVerificado(null)
    if (!/^\d{8}$/.test(dni.trim())) {
      setError('El DNI debe tener exactamente 8 dígitos numéricos')
      return
    }
    setCargando(true)
    try {
      onVerificado(await prestamosApi.verificarLector(dni.trim()))
    } catch (e) {
      const { status, mensaje } = normalizarError(e)
      setNoRegistrado(status === 404)
      setError(mensaje)
    } finally {
      setCargando(false)
    }
  }

  async function desbloquear(e: FormEvent) {
    e.preventDefault()
    if (!lector) return
    if (!motivo.trim()) {
      setErrorDesbloqueo('El motivo del desbloqueo es obligatorio')
      return
    }
    setErrorDesbloqueo(null)
    try {
      await prestamosApi.desbloquearLector(lector.id, motivo.trim())
      setMotivo('')
      onVerificado(await prestamosApi.verificarLector(lector.dni))
    } catch (e) {
      setErrorDesbloqueo(normalizarError(e).mensaje)
    }
  }

  return (
    <section className="formulario" aria-label="Verificación del lector">
      <h2>1. Verificar al lector</h2>
      <form onSubmit={verificar} noValidate className="fila-autor">
        <input
          aria-label="DNI del lector"
          value={dni}
          onChange={(e) => setDni(e.target.value)}
          inputMode="numeric"
          maxLength={8}
          autoComplete="off"
          disabled={cargando}
        />
        <button type="submit" className="boton-secundario" disabled={cargando}>
          Verificar lector
        </button>
      </form>

      {error && (
        <p className="alerta" role="alert">
          {error}{' '}
          {noRegistrado && <Link to={RUTAS.lectores}>Registrar al lector</Link>}
        </p>
      )}

      {lector && (
        <div className="datos-lector" aria-label="Datos del lector">
          <p>
            <strong>
              {lector.nombres} {lector.apellidos}
            </strong>{' '}
            · {NOMBRE_CATEGORIA[lector.categoria]}
          </p>
          <p>
            DNI: <code data-testid="dni-verificado">{lector.dni}</code>
          </p>
          {lector.esMenor && (
            <p>
              Menor de edad · Apoderado: {lector.apoderadoNombre} (DNI{' '}
              {lector.apoderadoDni})
            </p>
          )}

          {lector.tienePrestamoActivo && (
            <p className="alerta" role="alert">
              El lector ya tiene un préstamo activo y no puede recibir otro.
            </p>
          )}

          {lector.morosidad.estado === 'ADVERTENCIA' && (
            <div className="aviso" role="alert">
              <p>{lector.morosidad.mensaje}</p>
              <label htmlFor="justificacion">Justificación</label>
              <textarea
                id="justificacion"
                value={justificacion}
                onChange={(e) => onJustificacion(e.target.value)}
                aria-invalid={!!errorJustificacion}
                maxLength={500}
                rows={3}
              />
              <span className="error-campo">{errorJustificacion}</span>
            </div>
          )}

          {lector.morosidad.estado === 'BLOQUEADO' && (
            <div className="alerta" role="alert">
              <p>{lector.morosidad.mensaje}</p>
              {rol === 'ADMINISTRADOR' ? (
                <form onSubmit={desbloquear} noValidate>
                  <label htmlFor="motivo-desbloqueo">
                    Motivo del desbloqueo
                  </label>
                  <input
                    id="motivo-desbloqueo"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    maxLength={500}
                  />
                  <span className="error-campo">{errorDesbloqueo}</span>
                  <button type="submit" className="boton-secundario">
                    Desbloquear lector
                  </button>
                </form>
              ) : (
                <p>Pida a un Administrador que lo desbloquee.</p>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
