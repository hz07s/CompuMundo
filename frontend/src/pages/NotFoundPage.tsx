import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <main className="page">
      <h1>Página no encontrada</h1>
      <Link to="/">Volver al inicio</Link>
    </main>
  )
}
