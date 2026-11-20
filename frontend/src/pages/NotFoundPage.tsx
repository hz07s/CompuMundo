import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <main className="pagina-error">
      <h1>Página no encontrada</h1>
      <p>La dirección no existe o cambió.</p>
      <Link to="/" className="boton-primario">
        Volver al inicio
      </Link>
    </main>
  )
}
