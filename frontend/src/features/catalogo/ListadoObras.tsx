import { useEffect, useState } from 'react'
import { normalizarError } from '../../services/apiError'
import { obrasApi } from './obrasApi'
import type { ObrasPaginadas } from './types'

const POR_PAGINA = 10

/** Obras registradas, más recientes primero. `version` recarga el listado. */
export default function ListadoObras({ version }: { version: number }) {
  const [pagina, setPagina] = useState(1)
  const [resultado, setResultado] = useState<ObrasPaginadas | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Tras registrar una obra se vuelve a la primera página para verla.
  useEffect(() => setPagina(1), [version])

  useEffect(() => {
    let vigente = true
    setError(null)
    obrasApi
      .listar(pagina, POR_PAGINA)
      .then((r) => vigente && setResultado(r))
      .catch((e: unknown) => vigente && setError(normalizarError(e).mensaje))
    return () => {
      vigente = false
    }
  }, [pagina, version])

  const totalPaginas = resultado
    ? Math.max(1, Math.ceil(resultado.total / POR_PAGINA))
    : 1

  return (
    <section>
      <h2>Obras registradas</h2>
      {error && (
        <p className="alerta" role="alert">
          {error}
        </p>
      )}
      {!resultado && !error && <p>Cargando…</p>}
      {resultado?.total === 0 && <p>Todavía no hay obras registradas.</p>}
      {resultado && resultado.total > 0 && (
        <>
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Autores</th>
                  <th>Categoría</th>
                  <th>Publicación</th>
                  <th>Disponibles</th>
                </tr>
              </thead>
              <tbody>
                {resultado.data.map((o) => (
                  <tr key={o.id}>
                    <td>{o.titulo}</td>
                    <td>{o.autores.join(', ')}</td>
                    <td>{o.categoria}</td>
                    <td>{o.fechaPublicacion}</td>
                    <td>
                      {o.disponibilidad} / {o.totalEjemplares}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav className="paginacion" aria-label="Paginación">
            <button
              type="button"
              className="boton-secundario"
              onClick={() => setPagina((p) => p - 1)}
              disabled={pagina <= 1}
            >
              Anterior
            </button>
            <span>
              Página {pagina} de {totalPaginas}
            </span>
            <button
              type="button"
              className="boton-secundario"
              onClick={() => setPagina((p) => p + 1)}
              disabled={pagina >= totalPaginas}
            >
              Siguiente
            </button>
          </nav>
        </>
      )}
    </section>
  )
}
