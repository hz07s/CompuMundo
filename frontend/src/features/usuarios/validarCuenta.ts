/** Valores del formulario de alta tal como los escribe el Administrador. */
export interface FormularioCuenta {
  nombreUsuario: string
  password: string
  rol: string
  email: string
}

export type ErroresCuenta = Partial<Record<keyof FormularioCuenta, string>>

export const MENSAJE_NOMBRE =
  'De 3 a 50 caracteres: letras minúsculas, números, punto, guion o guion bajo'
export const MENSAJE_CLAVE = 'La contraseña debe tener entre 8 y 72 caracteres'

const FORMATO_NOMBRE = /^[a-z0-9._-]{3,50}$/
const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validarClave(password: string): string | undefined {
  return password.length < 8 || password.length > 72 ? MENSAJE_CLAVE : undefined
}

/** Mismas reglas que CrearUsuarioDto (HU-021); el servidor vuelve a validar. */
export function validarCuenta(form: FormularioCuenta): ErroresCuenta {
  const errores: ErroresCuenta = {}
  if (!FORMATO_NOMBRE.test(form.nombreUsuario.trim().toLowerCase())) {
    errores.nombreUsuario = MENSAJE_NOMBRE
  }
  const clave = validarClave(form.password)
  if (clave) errores.password = clave
  if (!form.rol) errores.rol = 'Seleccione un rol'
  const correo = form.email.trim()
  if (correo && (!FORMATO_CORREO.test(correo) || correo.length > 120)) {
    errores.email = 'El correo no es válido'
  }
  return errores
}
