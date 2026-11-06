/** Valores del formulario tal como los escribe el usuario. */
export interface FormularioObra {
  titulo: string
  categoria: string
  autores: string[]
  fechaPublicacion: string
  volumen: string
  anioEdicion: string
  cantidad: string
}

export type ErroresObra = Partial<Record<keyof FormularioObra, string>>

export const MAX_EJEMPLARES = 500
export const MAX_VOLUMEN = 9999

/** Mismas reglas que el backend (ST-13), para avisar antes de enviar. */
export function validarObra(form: FormularioObra): ErroresObra {
  const errores: ErroresObra = {}
  if (!form.titulo.trim()) errores.titulo = 'El título es obligatorio'
  if (!form.categoria.trim()) errores.categoria = 'La categoría es obligatoria'
  if (!form.autores.some((a) => a.trim())) {
    errores.autores = 'Indique al menos un autor'
  }
  if (!form.fechaPublicacion) {
    errores.fechaPublicacion = 'La fecha de publicación es obligatoria'
  }

  const volumen = form.volumen.trim()
  if (volumen) {
    if (!/^-?\d+$/.test(volumen)) {
      errores.volumen = 'El volumen debe ser un número entero'
    } else if (Number(volumen) < 1) {
      errores.volumen = 'El volumen debe ser mayor o igual que 1'
    } else if (Number(volumen) > MAX_VOLUMEN) {
      errores.volumen = `El volumen no puede superar ${MAX_VOLUMEN}`
    }
  }

  const anio = form.anioEdicion.trim()
  if (!anio) {
    errores.anioEdicion = 'El año de edición es obligatorio'
  } else if (!/^\d+$/.test(anio)) {
    errores.anioEdicion = 'El año de edición debe ser un número entero'
  } else if (anio.length !== 4 || Number(anio) < 1000) {
    errores.anioEdicion = 'El año de edición debe tener 4 dígitos'
  }

  const cantidad = form.cantidad.trim()
  if (!cantidad) {
    errores.cantidad = 'La cantidad es obligatoria'
  } else if (!/^-?\d+$/.test(cantidad)) {
    errores.cantidad = 'La cantidad debe ser un número entero'
  } else if (Number(cantidad) < 1) {
    errores.cantidad = 'La cantidad debe ser mayor que 0'
  } else if (Number(cantidad) > MAX_EJEMPLARES) {
    errores.cantidad = `La cantidad no puede superar ${MAX_EJEMPLARES} por registro`
  }
  return errores
}
