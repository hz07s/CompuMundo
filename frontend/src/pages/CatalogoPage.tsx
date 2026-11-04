import { useState } from 'react'
import ListadoObras from '../features/catalogo/ListadoObras'
import ObraRegistrada from '../features/catalogo/ObraRegistrada'
import RegistroObraForm from '../features/catalogo/RegistroObraForm'
import type { ObraDetalle } from '../features/catalogo/types'

/** Módulo del Bibliotecario: registro de obras y ejemplares (HU-002). */
export default function CatalogoPage() {
  const [registrada, setRegistrada] = useState<ObraDetalle | null>(null)
  const [version, setVersion] = useState(0)

  return (
    <main className="page">
      <h1>Catálogo</h1>
      <div className="catalogo">
        <RegistroObraForm
          onRegistrada={(obra) => {
            setRegistrada(obra)
            setVersion((v) => v + 1)
          }}
        />
        {registrada && <ObraRegistrada obra={registrada} />}
      </div>
      <ListadoObras version={version} />
    </main>
  )
}
