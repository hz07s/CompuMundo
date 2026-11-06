import { useState } from 'react'
import { useAuth } from '../features/auth/useAuth'
import PrestamoConfirmado from '../features/prestamos/PrestamoConfirmado'
import { prestamosApi } from '../features/prestamos/prestamosApi'
import SeleccionEjemplar from '../features/prestamos/SeleccionEjemplar'
import type {
  EjemplarConsulta,
  LectorVerificacion,
  PrestamoRegistrado,
} from '../features/prestamos/types'
import VerificacionLector from '../features/prestamos/VerificacionLector'
import { normalizarError } from '../services/apiError'

/**
 * Registro de préstamos con verificación presencial del DNI (HU-004, HU-007).
 * El Administrador consulta y desbloquea; solo el Bibliotecario registra.
 */
export default function PrestamosPage() {
  const { sesion } = useAuth()
  const rol = sesion.estado === 'autenticado' ? sesion.usuario.rol : null

  const [lector, setLector] = useState<LectorVerificacion | null>(null)
  const [ejemplar, setEjemplar] = useState<EjemplarConsulta | null>(null)
  const [justificacion, setJustificacion] = useState('')
  const [errorJustificacion, setErrorJustificacion] = useState<string>()
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [registrando, setRegistrando] = useState(false)
  const [registrado, setRegistrado] = useState<PrestamoRegistrado | null>(null)
  // Cambiar la clave reinicia los pasos 1 y 2 y borra el DNI completo de la pantalla.
  const [ronda, setRonda] = useState(0)

  if (!rol) return null

  const exigeJustificacion = lector?.morosidad.estado === 'ADVERTENCIA'
  const lectorApto =
    !!lector &&
    !lector.tienePrestamoActivo &&
    lector.morosidad.estado !== 'BLOQUEADO'
  const puedeRegistrar =
    rol === 'BIBLIOTECARIO' && lectorApto && !!ejemplar?.disponible

  async function registrar() {
    if (!lector || !ejemplar) return
    setErrorGeneral(null)
    if (exigeJustificacion && !justificacion.trim()) {
      setErrorJustificacion('La justificación escrita es obligatoria')
      return
    }
    setErrorJustificacion(undefined)

    setRegistrando(true)
    try {
      const prestamo = await prestamosApi.registrar({
        lectorId: lector.id,
        codigoEjemplar: ejemplar.codigo,
        ...(exigeJustificacion && { justificacion: justificacion.trim() }),
      })
      setRegistrado(prestamo)
      setLector(null)
      setEjemplar(null)
      setJustificacion('')
      setRonda((r) => r + 1)
    } catch (e) {
      setErrorGeneral(normalizarError(e).mensaje)
    } finally {
      setRegistrando(false)
    }
  }

  return (
    <main className="page">
      <h1>Préstamos</h1>
      {rol === 'ADMINISTRADOR' && (
        <p className="aviso">
          Como Administrador puede consultar al lector y desbloquearlo; solo el
          Bibliotecario registra préstamos.
        </p>
      )}

      <div className="catalogo">
        <VerificacionLector
          key={`lector-${ronda}`}
          rol={rol}
          lector={lector}
          justificacion={justificacion}
          errorJustificacion={errorJustificacion}
          onVerificado={(l) => {
            setLector(l)
            setRegistrado(null)
            setErrorGeneral(null)
          }}
          onJustificacion={(t) => {
            setJustificacion(t)
            setErrorJustificacion(undefined)
          }}
        />
        <SeleccionEjemplar
          key={`ejemplar-${ronda}`}
          ejemplar={ejemplar}
          onConsultado={(e) => {
            setEjemplar(e)
            setErrorGeneral(null)
          }}
        />
      </div>

      {errorGeneral && (
        <p className="alerta" role="alert">
          {errorGeneral}
        </p>
      )}

      {rol === 'BIBLIOTECARIO' && (
        <button
          type="button"
          className="boton-primario"
          onClick={registrar}
          disabled={!puedeRegistrar || registrando}
        >
          {registrando ? 'Registrando…' : 'Registrar préstamo'}
        </button>
      )}

      {registrado && <PrestamoConfirmado prestamo={registrado} />}
    </main>
  )
}
