import { useState, type FormEvent } from 'react'
import {
  Navigate,
  useLocation,
  useNavigate,
  type Location,
} from 'react-router-dom'
import EstadoApi from '../components/EstadoApi'
import { destinoTrasLogin, INICIO_POR_ROL } from '../features/auth/rutas'
import { useAuth } from '../features/auth/useAuth'
import { normalizarError } from '../services/apiError'

interface Errores {
  nombreUsuario?: string
  password?: string
  general?: string
}

export default function LoginPage() {
  const { sesion, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const desde = (location.state as { desde?: Location } | null)?.desde

  const [nombreUsuario, setNombreUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [errores, setErrores] = useState<Errores>({})
  const [enviando, setEnviando] = useState(false)

  if (sesion.estado === 'autenticado') {
    return <Navigate to={INICIO_POR_ROL[sesion.usuario.rol]} replace />
  }

  function validar(): Errores {
    const nuevos: Errores = {}
    if (!nombreUsuario.trim()) nuevos.nombreUsuario = 'Ingrese su usuario'
    if (!password) nuevos.password = 'Ingrese su contraseña'
    return nuevos
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const nuevos = validar()
    setErrores(nuevos)
    if (Object.keys(nuevos).length) return

    setEnviando(true)
    try {
      const usuario = await login(nombreUsuario.trim(), password)
      navigate(destinoTrasLogin(usuario.rol, desde?.pathname), {
        replace: true,
      })
    } catch (error) {
      const { mensaje, campos } = normalizarError(error)
      setErrores({ ...campos, general: mensaje })
      setPassword('')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="login">
      <form className="tarjeta" onSubmit={onSubmit} noValidate>
        <h1>CompuMundo CEDIS</h1>
        <p className="subtitulo">Ingrese con su cuenta del personal</p>

        {errores.general && (
          <p className="alerta" role="alert">
            {errores.general}
          </p>
        )}

        <label htmlFor="nombreUsuario">Usuario</label>
        <input
          id="nombreUsuario"
          autoComplete="username"
          value={nombreUsuario}
          onChange={(e) => setNombreUsuario(e.target.value)}
          aria-invalid={!!errores.nombreUsuario}
          aria-describedby="error-nombreUsuario"
          disabled={enviando}
          autoFocus
        />
        <span id="error-nombreUsuario" className="error-campo">
          {errores.nombreUsuario}
        </span>

        <label htmlFor="password">Contraseña</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={!!errores.password}
          aria-describedby="error-password"
          disabled={enviando}
        />
        <span id="error-password" className="error-campo">
          {errores.password}
        </span>

        <button type="submit" className="boton-primario" disabled={enviando}>
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </button>
        <EstadoApi />
      </form>
    </main>
  )
}
