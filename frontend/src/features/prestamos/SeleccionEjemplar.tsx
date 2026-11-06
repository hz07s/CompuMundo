import { useState, type FormEvent } from 'react'
import { normalizarError } from '../../services/apiError'
import { prestamosApi } from './prestamosApi'
import type { EjemplarConsulta } from './types'

interface Props {
  ejemplar: EjemplarConsulta | null
  onConsultado: (ejemplar: EjemplarConsulta | null) => void
}

/** Paso 2 del préstamo: código del ejemplar y verificación de su disponibilidad (A1). */
export default function SeleccionEjemplar({ ejemplar, onConsultado }: Props) {
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  async function consultar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    onConsultado(null)
    if (!codigo.trim()) {
      setError('El código del ejemplar es obligatorio')
      return
    }
    setCargando(true)
    try {
      onConsultado(await prestamosApi.consultarEjemplar(codigo.trim()))
    } catch (e) {
      setError(normalizarError(e).mensaje)
    } finally {
      setCargando(false)
    }
  }

  return (
    <section className="formulario" aria-label="Selección del ejemplar">
      <h2>2. Seleccionar el ejemplar</h2>
      <form onSubmit={consultar} noValidate className="fila-autor">
        <input
          aria-label="Código del ejemplar"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          placeholder="CEDIS-2026-000001"
          maxLength={20}
          autoComplete="off"
          disabled={cargando}
        />
        <button type="submit" className="boton-secundario" disabled={cargando}>
          Consultar ejemplar
        </button>
      </form>

      {error && (
        <p className="alerta" role="alert">
          {error}
        </p>
      )}

      {ejemplar && (
        <div className="datos-lector" aria-label="Datos del ejemplar">
          <p>
            <strong>{ejemplar.obra.titulo}</strong> ·{' '}
            <code>{ejemplar.codigo}</code>
          </p>
          {ejemplar.disponible ? (
            <p>Disponible</p>
          ) : (
            <p className="alerta" role="alert">
              El ejemplar no está disponible: ya está prestado.
            </p>
          )}
        </div>
      )}
    </section>
  )
}
