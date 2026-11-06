import { useState } from 'react'
import LectorRegistrado from '../features/lectores/LectorRegistrado'
import RegistroLectorForm from '../features/lectores/RegistroLectorForm'
import type { LectorRegistrado as Lector } from '../features/lectores/types'

/** Módulo del Bibliotecario: registro de lectores (HU-003). */
export default function LectoresPage() {
  const [registrado, setRegistrado] = useState<Lector | null>(null)

  return (
    <main className="page">
      <h1>Lectores</h1>
      <div className="catalogo">
        <RegistroLectorForm onRegistrado={setRegistrado} />
        {registrado && <LectorRegistrado lector={registrado} />}
      </div>
    </main>
  )
}
