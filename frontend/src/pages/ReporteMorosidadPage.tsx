import ReporteMorosidad from '../features/reportes/ReporteMorosidad'

/** Reporte de morosidad exportable (HU-006, ST-37). Bibliotecario y Administrador. */
export default function ReporteMorosidadPage() {
  return (
    <main className="page">
      <h1>Reporte de morosidad</h1>
      <p className="subtitulo">
        Préstamos con la fecha de devolución vencida. El DNI se muestra siempre
        enmascarado.
      </p>
      <ReporteMorosidad />
    </main>
  )
}
