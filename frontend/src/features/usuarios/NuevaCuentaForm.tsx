import { useState, type FormEvent } from 'react'
import type { Rol } from '../auth/types'
import { normalizarError } from '../../services/apiError'
import { NOMBRE_ROL, ROLES, type Cuenta } from './types'
import { usuariosApi } from './usuariosApi'
import {
  validarCuenta,
  type ErroresCuenta,
  type FormularioCuenta,
} from './validarCuenta'

const VACIO: FormularioCuenta = {
  nombreUsuario: '',
  password: '',
  rol: 'BIBLIOTECARIO',
  email: '',
}

interface Props {
  onCreada: (cuenta: Cuenta) => void
}

/** Alta de una cuenta del personal (HU-021 #1). */
export default function NuevaCuentaForm({ onCreada }: Props) {
  const [form, setForm] = useState<FormularioCuenta>(VACIO)
  const [errores, setErrores] = useState<ErroresCuenta>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const cambiar = (campo: keyof FormularioCuenta, valor: string) => {
    setForm((f) => ({ ...f, [campo]: valor }))
    setErrores((e) => ({ ...e, [campo]: undefined }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErrorGeneral(null)
    const nuevos = validarCuenta(form)
    setErrores(nuevos)
    if (Object.keys(nuevos).length) return

    setEnviando(true)
    try {
      // Minúsculas: Google entrega el correo así (HU-022).
      const email = form.email.trim().toLowerCase()
      const cuenta = await usuariosApi.crear({
        nombreUsuario: form.nombreUsuario.trim().toLowerCase(),
        password: form.password,
        rol: form.rol as Rol,
        ...(email && { email }),
      })
      setForm(VACIO)
      onCreada(cuenta)
    } catch (error) {
      const { status, mensaje, campos } = normalizarError(error)
      // Un nombre o correo repetido (409) se señala junto al campo.
      const campo409 = mensaje.includes('correo') ? 'email' : 'nombreUsuario'
      setErrores(
        status === 409 ? { [campo409]: mensaje } : (campos as ErroresCuenta),
      )
      setErrorGeneral(mensaje)
    } finally {
      setEnviando(false)
    }
  }

  const props = (campo: keyof FormularioCuenta) => ({
    id: `cuenta-${campo}`,
    'aria-invalid': !!errores[campo],
    'aria-describedby': `error-cuenta-${campo}`,
    disabled: enviando,
  })
  const error = (campo: keyof FormularioCuenta) => (
    <span id={`error-cuenta-${campo}`} className="error-campo">
      {errores[campo]}
    </span>
  )

  return (
    <form className="formulario" onSubmit={onSubmit} noValidate>
      <h2>Nueva cuenta</h2>
      {errorGeneral && (
        <p className="alerta" role="alert">
          {errorGeneral}
        </p>
      )}

      <label htmlFor="cuenta-nombreUsuario">Nombre de usuario</label>
      <input
        {...props('nombreUsuario')}
        value={form.nombreUsuario}
        onChange={(e) => cambiar('nombreUsuario', e.target.value)}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={50}
      />
      {error('nombreUsuario')}

      <label htmlFor="cuenta-password">Contraseña inicial</label>
      <input
        {...props('password')}
        type="password"
        value={form.password}
        onChange={(e) => cambiar('password', e.target.value)}
        autoComplete="new-password"
        maxLength={72}
      />
      <span className="ayuda">Mínimo 8 caracteres. Entréguela en persona.</span>
      {error('password')}

      <label htmlFor="cuenta-rol">Rol</label>
      <select
        {...props('rol')}
        value={form.rol}
        onChange={(e) => cambiar('rol', e.target.value)}
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {NOMBRE_ROL[r]}
          </option>
        ))}
      </select>
      {error('rol')}

      <label htmlFor="cuenta-email">
        Correo de Google <span className="opcional">(opcional)</span>
      </label>
      <input
        {...props('email')}
        type="email"
        value={form.email}
        onChange={(e) => cambiar('email', e.target.value)}
        autoComplete="off"
        maxLength={120}
      />
      <span className="ayuda">Permite entrar con «Continuar con Google».</span>
      {error('email')}

      <button type="submit" className="boton-primario" disabled={enviando}>
        {enviando ? 'Creando…' : 'Crear cuenta'}
      </button>
    </form>
  )
}
