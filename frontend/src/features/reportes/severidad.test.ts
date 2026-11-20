import { severidad } from './severidad'

describe('severidad del atraso (solo visual, HU-006)', () => {
  it.each([
    [1, 'Leve'],
    [3, 'Leve'],
    [4, 'Moderado'],
    [7, 'Moderado'],
    [8, 'Grave'],
    [120, 'Grave'],
  ])('%i días → %s', (dias, nombre) => {
    expect(severidad(dias).nombre).toBe(nombre)
  })
})
