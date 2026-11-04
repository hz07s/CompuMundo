import { destinoTrasLogin, puedeEntrar } from './rutas'

describe('rutas por rol', () => {
  it('cada módulo solo admite su rol', () => {
    expect(puedeEntrar('/admin/usuarios', 'ADMINISTRADOR')).toBe(true)
    expect(puedeEntrar('/admin/usuarios', 'BIBLIOTECARIO')).toBe(false)
    expect(puedeEntrar('/catalogo/nueva', 'BIBLIOTECARIO')).toBe(true)
    expect(puedeEntrar('/catalogo', 'ADMINISTRADOR')).toBe(false)
  })

  it('tras el login vuelve a la ruta pedida si el rol puede verla', () => {
    expect(destinoTrasLogin('BIBLIOTECARIO', '/catalogo')).toBe('/catalogo')
  })

  it('ignora una ruta pedida de otro rol y lleva al módulo propio', () => {
    expect(destinoTrasLogin('ADMINISTRADOR', '/catalogo')).toBe(
      '/admin/usuarios',
    )
  })

  it('sin ruta pedida lleva al módulo del rol', () => {
    expect(destinoTrasLogin('BIBLIOTECARIO')).toBe('/catalogo')
    expect(destinoTrasLogin('ADMINISTRADOR', '/')).toBe('/admin/usuarios')
  })
})
