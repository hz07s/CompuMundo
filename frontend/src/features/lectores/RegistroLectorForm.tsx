import { useState, type FormEvent } from 'react'
import { normalizarError } from '../../services/apiError'
import { lectoresApi } from './lectoresApi'
import {
  CATEGORIAS_LECTOR,
  NOMBRE_CATEGORIA,
  type CategoriaLector,
  type LectorRegistrado,
} from './types'
import {
  esMenor,
  validarLector,
  type ErroresLector,
  type FormularioLector,
} from './validarLector'

const VACIO: FormularioLector = {
  dni: '',
  nombres: '',
  apellidos: '',
  categoria: '',
  fechaNacimiento: '',
  apoderadoDni: '',
  apoderadoNombre: '',
  consentimientoApoderado: false,
}

interface Props {
  onRegistrado: (lector: LectorRegistrado) => void
}

/** Formulario de alta de lector (HU-003). La sección del apoderado solo aparece si es menor (RN-09). */
export default function RegistroLectorForm({ onRegistrado }: Props) {
  const [form, setForm] = useState<FormularioLector>(VACIO)
  const [errores, setErrores] = useState<ErroresLector>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const menor = esMenor(form.fechaNacimiento)

  const cambiar = <K extends keyof FormularioLector>(
    campo: K,
    valor: FormularioLector[K],
  ) => {
    setForm((f) => ({ ...f, [campo]: valor }))
    setErrores((e) => ({ ...e, [campo]: undefined }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErrorGeneral(null)
    const nuevos = validarLector(form)
    setErrores(nuevos)
    if (Object.keys(nuevos).length) return

    setEnviando(true)
    try {
      const lector = await lectoresApi.crear({
        dni: form.dni.trim(),
        nombres: form.nombres.trim(),
        apellidos: form.apellidos.trim(),
        categoria: form.categoria as CategoriaLector,
        fechaNacimiento: form.fechaNacimiento,
        ...(menor && {
          apoderadoDni: form.apoderadoDni.trim(),
          apoderadoNombre: form.apoderadoNombre.trim(),
          consentimientoApoderado: form.consentimientoApoderado,
        }),
      })
      setForm(VACIO)
      onRegistrado(lector)
    } catch (error) {
      const { status, mensaje, campos } = normalizarError(error)
      // Un DNI repetido (409) se señala junto al campo DNI.
      setErrores(status === 409 ? { dni: mensaje } : (campos as ErroresLector))
      setErrorGeneral(mensaje)
    } finally {
      setEnviando(false)
    }
  }

  const props = (campo: keyof FormularioLector) => ({
    id: campo,
    'aria-invalid': !!errores[campo],
    'aria-describedby': `error-${campo}`,
    disabled: enviando,
  })
  const error = (campo: keyof FormularioLector) => (
    <span id={`error-${campo}`} className="error-campo">
      {errores[campo]}
    </span>
  )

  return (
    <form className="formulario" onSubmit={onSubmit} noValidate>
      <h2>Registrar lector</h2>
      {errorGeneral && (
        <p className="alerta" role="alert">
          {errorGeneral}
        </p>
      )}

      <label htmlFor="dni">DNI</label>
      <input
        {...props('dni')}
        value={form.dni}
        onChange={(e) => cambiar('dni', e.target.value)}
        inputMode="numeric"
        maxLength={8}
        autoComplete="off"
      />
      {error('dni')}

      <div className="fila">
        <div>
          <label htmlFor="nombres">Nombres</label>
          <input
            {...props('nombres')}
            value={form.nombres}
            onChange={(e) => cambiar('nombres', e.target.value)}
            maxLength={100}
          />
          {error('nombres')}
        </div>
        <div>
          <label htmlFor="apellidos">Apellidos</label>
          <input
            {...props('apellidos')}
            value={form.apellidos}
            onChange={(e) => cambiar('apellidos', e.target.value)}
            maxLength={100}
          />
          {error('apellidos')}
        </div>
      </div>

      <div className="fila">
        <div>
          <label htmlFor="categoria">Categoría</label>
          <select
            {...props('categoria')}
            value={form.categoria}
            onChange={(e) => cambiar('categoria', e.target.value)}
          >
            <option value="">Seleccione…</option>
            {CATEGORIAS_LECTOR.map((c) => (
              <option key={c} value={c}>
                {NOMBRE_CATEGORIA[c]}
              </option>
            ))}
          </select>
          {error('categoria')}
        </div>
        <div>
          <label htmlFor="fechaNacimiento">Fecha de nacimiento</label>
          <input
            {...props('fechaNacimiento')}
            type="date"
            value={form.fechaNacimiento}
            onChange={(e) => cambiar('fechaNacimiento', e.target.value)}
          />
          {error('fechaNacimiento')}
        </div>
      </div>

      {menor && (
        <fieldset className="apoderado">
          <legend>Datos del apoderado (lector menor de 18 años)</legend>
          <label htmlFor="apoderadoDni">DNI del apoderado</label>
          <input
            {...props('apoderadoDni')}
            value={form.apoderadoDni}
            onChange={(e) => cambiar('apoderadoDni', e.target.value)}
            inputMode="numeric"
            maxLength={8}
            autoComplete="off"
          />
          {error('apoderadoDni')}

          <label htmlFor="apoderadoNombre">Nombre del apoderado</label>
          <input
            {...props('apoderadoNombre')}
            value={form.apoderadoNombre}
            onChange={(e) => cambiar('apoderadoNombre', e.target.value)}
            maxLength={200}
          />
          {error('apoderadoNombre')}

          <label className="casilla" htmlFor="consentimientoApoderado">
            <input
              {...props('consentimientoApoderado')}
              type="checkbox"
              checked={form.consentimientoApoderado}
              onChange={(e) =>
                cambiar('consentimientoApoderado', e.target.checked)
              }
            />
            Consentimiento firmado del apoderado recibido
          </label>
          {error('consentimientoApoderado')}
        </fieldset>
      )}

      <button type="submit" className="boton-primario" disabled={enviando}>
        {enviando ? 'Guardando…' : 'Registrar lector'}
      </button>
    </form>
  )
}
