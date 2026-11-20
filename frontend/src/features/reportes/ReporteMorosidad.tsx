import { useCallback, useEffect, useState } from 'react'
import { normalizarError } from '../../services/apiError'
import { formatearFecha } from '../prestamos/types'
import { reportesApi } from './reportesApi'
import { SEVERIDADES, severidad } from './severidad'
import type { ReporteMorosidad as Reporte } from './types'

/** Reporte de morosidad (HU-006, ST-37): tabla P-18 y exportación a Excel. */
export default function ReporteMorosidad() {
  const [reporte, setReporte] = useState<Reporte | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [exportando, setExportando] = useState(false)

  const cargar = useCallback(async () => {
    setError(null)
    try {
      setReporte(await reportesApi.morosidad())
    } catch (err) {
      setError(normalizarError(err).mensaje)
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  async function exportarExcel() {
    await descargar(reportesApi.morosidadExcel, 'xlsx')
  }

  async function exportarPdf() {
    await descargar(reportesApi.morosidadPdf, 'pdf')
  }

  async function descargar(obtener: () => Promise<Blob>, extension: string) {
    setError(null)
    setExportando(true)
    try {
      const blob = await obtener()
      const url = URL.createObjectURL(blob)
      const enlace = document.createElement('a')
      enlace.href = url
      // Fecha de Lima (en-CA da AAAA-MM-DD), igual que el nombre del backend.
      const hoy = new Date().toLocaleDateString('en-CA', {
        timeZone: 'America/Lima',
      })
      enlace.download = `morosidad-${hoy}.${extension}`
      enlace.click()
      // D-03: revocar después de que el navegador tome la descarga.
      setTimeout(() => URL.revokeObjectURL(url), 0)
    } catch (err) {
      setError(normalizarError(err).mensaje)
    } finally {
      setExportando(false)
    }
  }

  return (
    <section aria-label="Reporte de morosidad">
      {error && (
        <p className="alerta" role="alert">
          {error}
        </p>
      )}
      {!reporte && !error && <p role="status">Cargando reporte…</p>}
      {reporte && (
        <>
          <ul className="indicadores" aria-label="Resumen">
            <li className="indicador">
              <span className="indicador-etiqueta">Préstamos vencidos</span>
              <span className="indicador-valor">{reporte.total}</span>
            </li>
            <li className="indicador">
              <span className="indicador-etiqueta">Mayor atraso</span>
              <span className="indicador-valor">
                {mayorAtraso(reporte)}
                <small>{mayorAtraso(reporte) === 1 ? 'día' : 'días'}</small>
              </span>
            </li>
            <li className="indicador">
              <span className="indicador-etiqueta">Generado</span>
              <span className="indicador-valor indicador-fecha">
                {new Date(reporte.generadoEn).toLocaleTimeString('es-PE', {
                  timeZone: 'America/Lima',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span className="indicador-detalle">
                {new Date(reporte.generadoEn).toLocaleDateString('es-PE', {
                  timeZone: 'America/Lima',
                })}{' '}
                · hora de Lima
              </span>
            </li>
          </ul>

          <div className="barra">
            <span className="ayuda">
              Los archivos contienen exactamente lo que ve en pantalla.
            </span>
            <div className="barra-acciones">
              <button
                type="button"
                className="boton-secundario"
                onClick={exportarExcel}
                disabled={exportando}
              >
                Exportar Excel
              </button>
              <button
                type="button"
                className="boton-secundario"
                onClick={exportarPdf}
                disabled={exportando}
              >
                Exportar PDF
              </button>
            </div>
          </div>

          {reporte.total === 0 ? (
            <p className="vacio" role="status">
              <strong>No hay préstamos vencidos</strong>
              Todos los préstamos están al día.
            </p>
          ) : (
            <>
              <div className="tabla-contenedor">
                <table className="tabla">
                  <caption>Préstamos vencidos ({reporte.total})</caption>
                  <thead>
                    <tr>
                      <th scope="col">Código del ejemplar</th>
                      <th scope="col">Título de la obra</th>
                      <th scope="col">Lector</th>
                      <th scope="col">DNI</th>
                      <th scope="col">Fecha de préstamo</th>
                      <th scope="col">Fecha de devolución pactada</th>
                      <th scope="col">Días de atraso</th>
                      <th scope="col">Registrado por</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporte.filas.map((f) => {
                      const nivel = severidad(f.diasAtraso)
                      return (
                        <tr key={f.codigoEjemplar}>
                          <td>
                            <code>{f.codigoEjemplar}</code>
                          </td>
                          <td className="texto">{f.titulo}</td>
                          <td className="texto">{f.lector}</td>
                          <td>
                            <code>{f.dni}</code>
                          </td>
                          <td className="nowrap">
                            {formatearFecha(f.fechaPrestamo)}
                          </td>
                          <td className="nowrap">
                            {formatearFecha(f.fechaDevolucion)}
                          </td>
                          <td>
                            <span className={`estado ${nivel.clase}`}>
                              <strong>{f.diasAtraso}</strong>
                              <span aria-hidden="true">
                                {f.diasAtraso === 1 ? 'día' : 'días'}
                              </span>
                              <span className="sr-only">
                                días, atraso {nivel.nombre.toLowerCase()}
                              </span>
                            </span>
                          </td>
                          <td>{f.registradoPor ?? '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className="leyenda" aria-hidden="true">
                {SEVERIDADES.map((n) => (
                  <span key={n.clase} className={`estado ${n.clase}`}>
                    {n.nombre}: {n.rango}
                  </span>
                ))}
              </p>
            </>
          )}
        </>
      )}
    </section>
  )
}

function mayorAtraso(reporte: Reporte): number {
  return reporte.filas.reduce((max, f) => Math.max(max, f.diasAtraso), 0)
}
