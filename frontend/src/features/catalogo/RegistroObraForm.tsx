import { useState, type FormEvent } from 'react'
import { normalizarError } from '../../services/apiError'
import { obrasApi } from './obrasApi'
import type { ObraDetalle } from './types'
import {
  MAX_EJEMPLARES,
  validarObra,
  type ErroresObra,
  type FormularioObra,
} from './validarObra'

const VACIO: FormularioObra = {
  titulo: '',
  categoria: '',
  autores: [''],
  fechaPublicacion: '',
  cantidad: '1',
}

interface Props {
  onRegistrada: (obra: ObraDetalle) => void
}

/** Formulario de alta de obra y ejemplares (HU-002). */
export default function RegistroObraForm({ onRegistrada }: Props) {
  const [form, setForm] = useState<FormularioObra>(VACIO)
  const [errores, setErrores] = useState<ErroresObra>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const cambiar = <K extends keyof FormularioObra>(
    campo: K,
    valor: FormularioObra[K],
  ) => {
    setForm((f) => ({ ...f, [campo]: valor }))
    setErrores((e) => ({ ...e, [campo]: undefined }))
  }

  const cambiarAutor = (i: number, valor: string) =>
    cambiar(
      'autores',
      form.autores.map((a, j) => (j === i ? valor : a)),
    )

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErrorGeneral(null)
    const nuevos = validarObra(form)
    setErrores(nuevos)
    if (Object.keys(nuevos).length) return

    setEnviando(true)
    try {
      const obra = await obrasApi.crear({
        titulo: form.titulo.trim(),
        categoria: form.categoria.trim(),
        autores: form.autores.map((a) => a.trim()).filter(Boolean),
        fechaPublicacion: form.fechaPublicacion,
        cantidad: Number(form.cantidad),
      })
      setForm(VACIO)
      onRegistrada(obra)
    } catch (error) {
      const { mensaje, campos } = normalizarError(error)
      // Los errores por campo del servidor se muestran junto a cada campo.
      setErrores(campos as ErroresObra)
      setErrorGeneral(mensaje)
    } finally {
      setEnviando(false)
    }
  }

  const props = (campo: keyof FormularioObra) => ({
    id: campo,
    'aria-invalid': !!errores[campo],
    'aria-describedby': `error-${campo}`,
    disabled: enviando,
  })
  const error = (campo: keyof FormularioObra) => (
    <span id={`error-${campo}`} className="error-campo">
      {errores[campo]}
    </span>
  )

  return (
    <form className="formulario" onSubmit={onSubmit} noValidate>
      <h2>Registrar obra</h2>
      {errorGeneral && (
        <p className="alerta" role="alert">
          {errorGeneral}
        </p>
      )}

      <label htmlFor="titulo">Título</label>
      <input
        {...props('titulo')}
        value={form.titulo}
        onChange={(e) => cambiar('titulo', e.target.value)}
        maxLength={255}
      />
      {error('titulo')}

      <label htmlFor="categoria">Categoría</label>
      <input
        {...props('categoria')}
        value={form.categoria}
        onChange={(e) => cambiar('categoria', e.target.value)}
        maxLength={100}
      />
      {error('categoria')}

      <fieldset className="autores" aria-describedby="error-autores">
        <legend>Autores</legend>
        {form.autores.map((autor, i) => (
          <div key={i} className="fila-autor">
            <input
              aria-label={`Autor ${i + 1}`}
              aria-invalid={!!errores.autores}
              value={autor}
              onChange={(e) => cambiarAutor(i, e.target.value)}
              disabled={enviando}
              maxLength={150}
            />
            {form.autores.length > 1 && (
              <button
                type="button"
                className="boton-secundario"
                aria-label={`Quitar autor ${i + 1}`}
                onClick={() =>
                  cambiar(
                    'autores',
                    form.autores.filter((_, j) => j !== i),
                  )
                }
                disabled={enviando}
              >
                Quitar
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className="boton-secundario"
          onClick={() => cambiar('autores', [...form.autores, ''])}
          disabled={enviando || form.autores.length >= 20}
        >
          Agregar autor
        </button>
      </fieldset>
      {error('autores')}

      <div className="fila">
        <div>
          <label htmlFor="fechaPublicacion">Fecha de publicación</label>
          <input
            {...props('fechaPublicacion')}
            type="date"
            value={form.fechaPublicacion}
            onChange={(e) => cambiar('fechaPublicacion', e.target.value)}
          />
          {error('fechaPublicacion')}
        </div>
        <div>
          <label htmlFor="cantidad">Cantidad de ejemplares</label>
          <input
            {...props('cantidad')}
            type="number"
            min={1}
            max={MAX_EJEMPLARES}
            step={1}
            inputMode="numeric"
            value={form.cantidad}
            onChange={(e) => cambiar('cantidad', e.target.value)}
          />
          {error('cantidad')}
        </div>
      </div>

      <button type="submit" className="boton-primario" disabled={enviando}>
        {enviando ? 'Guardando…' : 'Registrar obra'}
      </button>
    </form>
  )
}
