import { useCallback, useEffect, useState } from 'react'
import { normalizarError } from '../../services/apiError'
import { formatearFecha } from '../prestamos/types'
import { reportesApi } from './reportesApi'
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
      enlace.download = `morosidad-${new Date().toISOString().slice(0, 10)}.${extension}`
      enlace.click()
      URL.revokeObjectURL(url)
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
      {reporte && (
        <>
          <p>
            Generado: {new Date(reporte.generadoEn).toLocaleString('es-PE')} ·
            Total: {reporte.total}
          </p>
          <button
            type="button"
            className="boton-primario"
            onClick={exportarExcel}
            disabled={exportando}
          >
            Exportar Excel
          </button>{' '}
          <button
            type="button"
            className="boton-secundario"
            onClick={exportarPdf}
            disabled={exportando}
          >
            Exportar PDF
          </button>
          {reporte.total === 0 ? (
            <p role="status">No hay préstamos vencidos</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Título</th>
                  <th>Lector</th>
                  <th>DNI</th>
                  <th>Préstamo</th>
                  <th>Devolución pactada</th>
                  <th>Días de atraso</th>
                  <th>Registrado por</th>
                </tr>
              </thead>
              <tbody>
                {reporte.filas.map((f) => (
                  <tr key={f.codigoEjemplar}>
                    <td>{f.codigoEjemplar}</td>
                    <td>{f.titulo}</td>
                    <td>{f.lector}</td>
                    <td>
                      <code>{f.dni}</code>
                    </td>
                    <td>{formatearFecha(f.fechaPrestamo)}</td>
                    <td>{formatearFecha(f.fechaDevolucion)}</td>
                    <td>{f.diasAtraso}</td>
                    <td>{f.registradoPor ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </section>
  )
}
