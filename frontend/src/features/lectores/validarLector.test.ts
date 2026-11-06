import { calcularEdad, esMenor, validarLector } from './validarLector'

describe('edad del lector (RN-09)', () => {
  const hoy = new Date(2026, 10, 5) // 5/nov/2026

  it.each([
    ['2008-11-05', 18],
    ['2008-11-06', 17],
    ['2000-01-01', 26],
  ])('nacido el %s tiene %i años', (fecha, edad) => {
    expect(calcularEdad(fecha, hoy)).toBe(edad)
  })

  it('quien cumple 18 años hoy ya no es menor', () => {
    expect(esMenor('2008-11-05', hoy)).toBe(false)
    expect(esMenor('2008-11-06', hoy)).toBe(true)
  })

  it.each(['', '2026-02-30', '05/11/2008'])(
    'la fecha %p no tiene edad ni se asume menor',
    (fecha) => {
      expect(calcularEdad(fecha, hoy)).toBeNull()
      expect(esMenor(fecha, hoy)).toBe(false)
    },
  )

  const base = {
    dni: '12345678',
    nombres: 'Ana',
    apellidos: 'Quispe',
    categoria: 'DOCENTE',
    fechaNacimiento: '1990-01-01',
    apoderadoDni: '',
    apoderadoNombre: '',
    consentimientoApoderado: false,
  }

  it('un mayor con datos de apoderado vacíos no tiene errores', () => {
    expect(validarLector(base, hoy)).toEqual({})
  })

  it('una fecha inexistente se señala como no válida', () => {
    const errores = validarLector(
      { ...base, fechaNacimiento: '2026-02-30' },
      hoy,
    )

    expect(errores.fechaNacimiento).toBe(
      'La fecha de nacimiento no es una fecha válida',
    )
  })
})
