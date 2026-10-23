import type { ObraDetalle } from './types'

/** Resultado del alta: códigos generados y disponibilidad (HU-002 #1). */
export default function ObraRegistrada({ obra }: { obra: ObraDetalle }) {
  return (
    <section className="resultado" role="status" aria-label="Obra registrada">
      <h2>Obra registrada</h2>
      <p>
        <strong>{obra.titulo}</strong> · Disponibilidad:{' '}
        <strong data-testid="disponibilidad">{obra.disponibilidad}</strong> de{' '}
        {obra.totalEjemplares}
      </p>
      <p>Códigos generados:</p>
      <ul className="codigos">
        {obra.ejemplares.map((e) => (
          <li key={e.id}>
            <code>{e.codigo}</code>
          </li>
        ))}
      </ul>
    </section>
  )
}
