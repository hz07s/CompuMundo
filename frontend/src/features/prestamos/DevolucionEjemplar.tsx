import { useEffect, useRef, useState, type FormEvent } from 'react'
import { normalizarError } from '../../services/apiError'
import { prestamosApi } from './prestamosApi'
import {
  formatearFecha,
  type DevolucionRegistrada,
  type PrestamoActivo,
} from './types'

/**
 * Devolución de un ejemplar (HU-005): el código se escanea o se escribe, se
 * muestra el préstamo y se confirma. Al terminar, el campo vuelve a quedar en
 * foco para el siguiente ejemplar. El DNI llega enmascarado (RNF-02).
 */
export default function DevolucionEjemplar() {
  const [codigo, setCodigo] = useState('')
  const [prestamo, setPrestamo] = useState<PrestamoActivo | null>(null)
  const [devuelto, setDevuelto] = useState<DevolucionRegistrada | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)
  const campoCodigo = useRef<HTMLInputElement>(null)

  // El campo está deshabilitado mientras se confirma: se enfoca al terminar.
  useEffect(() => {
    if (devuelto) campoCodigo.current?.focus()
  }, [devuelto])

  async function buscar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setPrestamo(null)
    setDevuelto(null)
    if (!codigo.trim()) {
      setError('El código del ejemplar es obligatorio')
      return
    }
    setCargando(true)
    try {
      setPrestamo(await prestamosApi.buscarActivo(codigo.trim()))
    } catch (err) {
      setError(normalizarError(err).mensaje)
    } finally {
      setCargando(false)
    }
  }

  async function confirmar() {
    if (!prestamo) return
    setError(null)
    setCargando(true)
    try {
      setDevuelto(await prestamosApi.devolver(prestamo.id))
      setPrestamo(null)
      setCodigo('')
    } catch (err) {
      setError(normalizarError(err).mensaje)
    } finally {
      setCargando(false)
    }
  }

  return (
    <section className="formulario" aria-label="Devolución de ejemplar">
      <h2>Ejemplar entregado</h2>
      <label htmlFor="codigo-devolucion">Código del ejemplar</label>
      <form onSubmit={buscar} noValidate className="fila-autor">
        <input
          ref={campoCodigo}
          id="codigo-devolucion"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          placeholder="CEDIS-2026-000001"
          maxLength={20}
          autoComplete="off"
          autoFocus
          disabled={cargando}
        />
        <button type="submit" className="boton-secundario" disabled={cargando}>
          Buscar préstamo
        </button>
      </form>

      {error && (
        <p className="alerta" role="alert">
          {error}
        </p>
      )}

      {prestamo && (
        <div className="datos-lector" aria-label="Datos del préstamo">
          <p>
            <strong>{prestamo.ejemplar.titulo}</strong> ·{' '}
            <code>{prestamo.ejemplar.codigo}</code>
          </p>
          <p>
            Lector: {prestamo.lector.nombres} {prestamo.lector.apellidos} · DNI{' '}
            <code>{prestamo.lector.dni}</code>
          </p>
          <p>
            Préstamo: {formatearFecha(prestamo.fechaPrestamo)} · Devolución
            pactada: {formatearFecha(prestamo.fechaDevolucion)}
          </p>
          {prestamo.estado === 'VENCIDO' && (
            <p role="status">
              <span className="estado critico">Vencido</span>{' '}
              <span className="ayuda">
                La devolución quedará registrada con atraso.
              </span>
            </p>
          )}
          <button
            type="button"
            className="boton-primario"
            onClick={confirmar}
            disabled={cargando}
          >
            Confirmar devolución
          </button>
        </div>
      )}

      {devuelto && (
        <p className="resultado" role="status">
          Devolución registrada: {devuelto.ejemplar.titulo} (
          {devuelto.ejemplar.codigo}) el{' '}
          {formatearFecha(devuelto.fechaDevuelto)}
          {devuelto.conAtraso ? ', con atraso.' : '.'}
        </p>
      )}
    </section>
  )
}
