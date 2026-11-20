import DevolucionEjemplar from '../features/prestamos/DevolucionEjemplar'

/** Devolución de ejemplares (HU-005, ST-33). Solo el Bibliotecario. */
export default function DevolucionPage() {
  return (
    <main className="page">
      <h1>Devolución de ejemplares</h1>
      <p className="subtitulo">
        Escanee o escriba el código del ejemplar que el lector entrega.
      </p>
      <DevolucionEjemplar />
    </main>
  )
}
