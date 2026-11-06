import { NOMBRE_CATEGORIA, type LectorRegistrado as Lector } from './types'

/** Resultado del alta (HU-003 #1): el DNI se muestra enmascarado (RNF-02). */
export default function LectorRegistrado({ lector }: { lector: Lector }) {
  return (
    <section className="resultado" role="status" aria-label="Lector registrado">
      <h2>Lector registrado</h2>
      <p>
        <strong>
          {lector.nombres} {lector.apellidos}
        </strong>{' '}
        · DNI <code data-testid="dni-enmascarado">{lector.dni}</code>
      </p>
      <p>
        {NOMBRE_CATEGORIA[lector.categoria]} ·{' '}
        {lector.activo ? 'Activo' : 'Inactivo'}
      </p>
      {lector.esMenor && (
        <p>
          Apoderado: {lector.apoderadoNombre} (DNI {lector.apoderadoDni}) ·
          Consentimiento{' '}
          {lector.consentimientoApoderado ? 'recibido' : 'pendiente'}
        </p>
      )}
    </section>
  )
}
