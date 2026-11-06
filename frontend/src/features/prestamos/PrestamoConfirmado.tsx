import { formatearFecha, type PrestamoRegistrado } from './types'

/** Confirmación del préstamo con la fecha de devolución (HU-004 #1). El DNI llega enmascarado. */
export default function PrestamoConfirmado({
  prestamo,
}: {
  prestamo: PrestamoRegistrado
}) {
  return (
    <section
      className="resultado"
      role="status"
      aria-label="Préstamo registrado"
    >
      <h2>Préstamo registrado</h2>
      <p>
        <strong>{prestamo.ejemplar.titulo}</strong> ·{' '}
        <code>{prestamo.ejemplar.codigo}</code>
      </p>
      <p>
        Lector: {prestamo.lector.nombres} {prestamo.lector.apellidos} · DNI{' '}
        <code>{prestamo.lector.dni}</code>
      </p>
      <p>
        Fecha de préstamo: {formatearFecha(prestamo.fechaPrestamo)} · Estado:{' '}
        {prestamo.estado === 'VIGENTE' ? 'Vigente' : prestamo.estado}
      </p>
      <p>
        Fecha de devolución:{' '}
        <strong data-testid="fecha-devolucion">
          {formatearFecha(prestamo.fechaDevolucion)}
        </strong>
      </p>
      {prestamo.justificacion && (
        <p>Justificación registrada: {prestamo.justificacion}</p>
      )}
    </section>
  )
}
