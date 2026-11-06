/** Valores del formulario tal como los escribe el usuario. */
export interface FormularioLector {
  dni: string
  nombres: string
  apellidos: string
  categoria: string
  fechaNacimiento: string
  apoderadoDni: string
  apoderadoNombre: string
  consentimientoApoderado: boolean
}

export type ErroresLector = Partial<Record<keyof FormularioLector, string>>

export const EDAD_MAYORIA = 18
export const MENSAJE_FORMATO_DNI =
  'El DNI debe tener exactamente 8 dígitos numéricos'

const FORMATO_DNI = /^\d{8}$/

/** Años cumplidos a `hoy`; null si la fecha está vacía o no existe en el calendario. */
export function calcularEdad(fecha: string, hoy: Date = new Date()) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha)
  if (!partes) return null
  const [anio, mes, dia] = partes.slice(1).map(Number)
  const nacimiento = new Date(Date.UTC(anio, mes - 1, dia))
  const existe =
    nacimiento.getUTCFullYear() === anio &&
    nacimiento.getUTCMonth() === mes - 1 &&
    nacimiento.getUTCDate() === dia
  if (!existe) return null

  const hoyAnio = hoy.getFullYear()
  const hoyMes = hoy.getMonth() + 1
  const hoyDia = hoy.getDate()
  let edad = hoyAnio - anio
  if (hoyMes < mes || (hoyMes === mes && hoyDia < dia)) edad -= 1
  return edad
}

/** Menor de 18 años a la fecha indicada (RN-09). Sin fecha válida no se asume menor. */
export function esMenor(fecha: string, hoy: Date = new Date()) {
  const edad = calcularEdad(fecha, hoy)
  return edad !== null && edad >= 0 && edad < EDAD_MAYORIA
}

/** Mismas reglas que el backend (ST-22), para avisar antes de enviar. */
export function validarLector(
  form: FormularioLector,
  hoy: Date = new Date(),
): ErroresLector {
  const errores: ErroresLector = {}
  const dni = form.dni.trim()
  if (!dni) errores.dni = 'El DNI es obligatorio'
  else if (!FORMATO_DNI.test(dni)) errores.dni = MENSAJE_FORMATO_DNI

  if (!form.nombres.trim()) errores.nombres = 'Los nombres son obligatorios'
  if (!form.apellidos.trim()) {
    errores.apellidos = 'Los apellidos son obligatorios'
  }
  if (!form.categoria) errores.categoria = 'La categoría es obligatoria'

  if (!form.fechaNacimiento) {
    errores.fechaNacimiento = 'La fecha de nacimiento es obligatoria'
  } else {
    const edad = calcularEdad(form.fechaNacimiento, hoy)
    if (edad === null) {
      errores.fechaNacimiento = 'La fecha de nacimiento no es una fecha válida'
    } else if (edad < 0) {
      errores.fechaNacimiento =
        'La fecha de nacimiento no puede ser posterior a hoy'
    }
  }

  if (esMenor(form.fechaNacimiento, hoy)) {
    const dniApoderado = form.apoderadoDni.trim()
    if (!dniApoderado) {
      errores.apoderadoDni = 'El DNI del apoderado es obligatorio'
    } else if (!FORMATO_DNI.test(dniApoderado)) {
      errores.apoderadoDni = MENSAJE_FORMATO_DNI
    }
    if (!form.apoderadoNombre.trim()) {
      errores.apoderadoNombre = 'El nombre del apoderado es obligatorio'
    }
    if (!form.consentimientoApoderado) {
      errores.consentimientoApoderado =
        'El consentimiento firmado del apoderado es obligatorio'
    }
  }
  return errores
}
