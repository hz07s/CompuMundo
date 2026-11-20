import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders } from 'axios'
import { vi } from 'vitest'
import { sesionStore } from '../../features/auth/sesionStore'
import type { Cuenta } from '../../features/usuarios/types'
import { usuariosApi } from '../../features/usuarios/usuariosApi'
import UsuariosPage from './UsuariosPage'

vi.mock('../../features/usuarios/usuariosApi')

const admin: Cuenta = {
  id: 'a-1',
  nombreUsuario: 'admin',
  rol: 'ADMINISTRADOR',
  email: null,
  activo: true,
  creadoEn: '2026-10-01T00:00:00Z',
}
const biblio: Cuenta = {
  id: 'b-1',
  nombreUsuario: 'mquispe',
  rol: 'BIBLIOTECARIO',
  email: 'mquispe@unsa.edu.pe',
  activo: true,
  creadoEn: '2026-10-02T00:00:00Z',
}

const conflicto = (message: string) =>
  new AxiosError('error', 'ERR_BAD_REQUEST', undefined, undefined, {
    status: 409,
    statusText: 'Conflict',
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: { statusCode: 409, message },
  })

const fila = (nombre: string) =>
  screen
    .getByRole('cell', { name: new RegExp(`^${nombre}(Usted)?$`) })
    .closest('tr')!

describe('UsuariosPage (HU-021)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    sesionStore.reiniciar({
      estado: 'autenticado',
      accessToken: 't',
      usuario: { id: 'a-1', nombreUsuario: 'admin', rol: 'ADMINISTRADOR' },
    })
    vi.mocked(usuariosApi.listar).mockResolvedValue([admin, biblio])
  })

  it('lista las cuentas con su rol y estado, y marca la propia', async () => {
    render(<UsuariosPage />)

    const tabla = await screen.findByRole('table', {
      name: 'Personal del sistema (2)',
    })
    expect(within(tabla).getByText('mquispe@unsa.edu.pe')).toBeInTheDocument()
    expect(within(fila('admin')).getByText('Usted')).toBeInTheDocument()
    expect(
      within(fila('admin')).getByRole('button', { name: 'Deshabilitar' }),
    ).toBeDisabled()
  })

  it('HU-021 #1: crea un Bibliotecario y lo agrega a la tabla', async () => {
    vi.mocked(usuariosApi.crear).mockResolvedValue({
      ...biblio,
      id: 'b-2',
      nombreUsuario: 'jperez',
      email: null,
    })
    const user = userEvent.setup()
    render(<UsuariosPage />)
    await screen.findByRole('table')

    await user.type(screen.getByLabelText('Nombre de usuario'), ' JPerez ')
    await user.type(screen.getByLabelText('Contraseña inicial'), 'clave-123')
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(usuariosApi.crear).toHaveBeenCalledWith({
      nombreUsuario: 'jperez',
      password: 'clave-123',
      rol: 'BIBLIOTECARIO',
    })
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Cuenta jperez creada',
    )
    expect(
      screen.getByRole('table', { name: 'Personal del sistema (3)' }),
    ).toBeInTheDocument()
  })

  it('HU-021 #2: valida antes de enviar y muestra el 409 junto al campo', async () => {
    const user = userEvent.setup()
    render(<UsuariosPage />)
    await screen.findByRole('table')

    await user.type(screen.getByLabelText('Nombre de usuario'), 'a')
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    expect(usuariosApi.crear).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Nombre de usuario')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(
      screen.getByText('La contraseña debe tener entre 8 y 72 caracteres'),
    ).toBeInTheDocument()

    vi.mocked(usuariosApi.crear).mockRejectedValue(
      conflicto('El nombre de usuario ya está registrado'),
    )
    await user.clear(screen.getByLabelText('Nombre de usuario'))
    await user.type(screen.getByLabelText('Nombre de usuario'), 'mquispe')
    await user.type(screen.getByLabelText('Contraseña inicial'), 'clave-123')
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'ya está registrado',
    )
    expect(screen.getByLabelText('Nombre de usuario')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
  })

  it('HU-021 #3: deshabilitar pide confirmación y actualiza el estado', async () => {
    vi.mocked(usuariosApi.actualizar).mockResolvedValue({
      ...biblio,
      activo: false,
    })
    const user = userEvent.setup()
    render(<UsuariosPage />)
    await screen.findByRole('table')

    await user.click(
      within(fila('mquispe')).getByRole('button', { name: 'Deshabilitar' }),
    )
    expect(usuariosApi.actualizar).not.toHaveBeenCalled()
    const confirmar = screen.getByRole('group', { name: 'Confirmar cambio' })
    expect(confirmar).toHaveTextContent('¿Deshabilitar a mquispe?')
    await user.click(
      within(confirmar).getByRole('button', { name: 'Confirmar' }),
    )

    expect(usuariosApi.actualizar).toHaveBeenCalledWith('b-1', {
      activo: false,
    })
    expect(
      within(fila('mquispe')).getByText('Deshabilitada'),
    ).toBeInTheDocument()
    expect(
      within(fila('mquispe')).getByRole('button', { name: 'Reactivar' }),
    ).toBeInTheDocument()
  })

  it('HU-021 #4: asigna una nueva contraseña desde la fila', async () => {
    vi.mocked(usuariosApi.actualizar).mockResolvedValue(biblio)
    const user = userEvent.setup()
    render(<UsuariosPage />)
    await screen.findByRole('table')

    await user.click(
      within(fila('mquispe')).getByRole('button', { name: 'Nueva contraseña' }),
    )
    const campo = screen.getByLabelText('Nueva contraseña para mquispe')
    await user.type(campo, 'corta')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(usuariosApi.actualizar).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('entre 8 y 72')

    await user.type(campo, '-y-segura')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(usuariosApi.actualizar).toHaveBeenCalledWith('b-1', {
      password: 'corta-y-segura',
    })
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Contraseña de mquispe actualizada',
    )
  })

  it('HU-021: si Reactivar falla muestra el error del servidor', async () => {
    vi.mocked(usuariosApi.listar).mockResolvedValue([
      admin,
      { ...biblio, activo: false },
    ])
    vi.mocked(usuariosApi.actualizar).mockRejectedValue(
      conflicto('Usuario no encontrado'),
    )
    const user = userEvent.setup()
    render(<UsuariosPage />)
    await screen.findByRole('table')

    await user.click(
      within(fila('mquispe')).getByRole('button', { name: 'Reactivar' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Usuario no encontrado',
    )
  })

  it('HU-021 #5: en su propia fila no puede cambiar rol, estado ni contraseña', async () => {
    render(<UsuariosPage />)
    await screen.findByRole('table')

    for (const nombre of [
      'Deshabilitar',
      'Hacer Bibliotecario',
      'Nueva contraseña',
    ]) {
      expect(
        within(fila('admin')).getByRole('button', { name: nombre }),
      ).toBeDisabled()
    }
  })

  it('muestra el error si no se pudo cargar el listado', async () => {
    vi.mocked(usuariosApi.listar).mockRejectedValue(new Error('x'))
    render(<UsuariosPage />)

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})
