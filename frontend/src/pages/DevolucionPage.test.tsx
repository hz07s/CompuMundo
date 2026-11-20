import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders } from 'axios'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { prestamosApi } from '../features/prestamos/prestamosApi'
import type {
  DevolucionRegistrada,
  PrestamoActivo,
} from '../features/prestamos/types'
import DevolucionPage from './DevolucionPage'

vi.mock('../features/prestamos/prestamosApi')

const activo: PrestamoActivo = {
  id: 'p-1',
  estado: 'VIGENTE',
  fechaPrestamo: '2026-11-06',
  fechaDevolucion: '2026-11-11',
  ejemplar: { codigo: 'CEDIS-2026-000001', titulo: 'Cálculo diferencial' },
  lector: { nombres: 'Ana', apellidos: 'Quispe', dni: '****8912' },
}

const devuelto: DevolucionRegistrada = {
  id: 'p-1',
  estado: 'DEVUELTO',
  fechaDevuelto: '2026-11-10',
  conAtraso: false,
  ejemplar: activo.ejemplar,
}

const error404 = new AxiosError(
  'error',
  'ERR_BAD_REQUEST',
  undefined,
  undefined,
  {
    status: 404,
    statusText: 'Not Found',
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: {
      statusCode: 404,
      message: 'No hay un préstamo activo para ese ejemplar',
    },
  },
)

function abrir() {
  render(
    <MemoryRouter>
      <DevolucionPage />
    </MemoryRouter>,
  )
  return userEvent.setup()
}

async function buscar(user: ReturnType<typeof userEvent.setup>) {
  await user.type(
    screen.getByLabelText('Código del ejemplar'),
    'CEDIS-2026-000001',
  )
  await user.click(screen.getByRole('button', { name: 'Buscar préstamo' }))
}

describe('DevolucionPage (HU-005, ST-33)', () => {
  beforeEach(() => vi.resetAllMocks())

  it('HU-005 #1: muestra el préstamo con DNI enmascarado, confirma y deja el campo en foco', async () => {
    vi.mocked(prestamosApi.buscarActivo).mockResolvedValue(activo)
    vi.mocked(prestamosApi.devolver).mockResolvedValue(devuelto)
    const user = abrir()

    await buscar(user)
    expect(await screen.findByText('****8912')).toBeInTheDocument()
    expect(screen.getByText(/Cálculo diferencial/)).toBeInTheDocument()
    expect(screen.queryByText('Vencido')).not.toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Confirmar devolución' }),
    )

    expect(prestamosApi.devolver).toHaveBeenCalledWith('p-1')
    expect(await screen.findByText(/Devolución registrada/)).toBeInTheDocument()
    expect(screen.getByLabelText('Código del ejemplar')).toHaveFocus()
    expect(screen.getByLabelText('Código del ejemplar')).toHaveValue('')
  })

  it('HU-005 #3: un préstamo vencido se muestra resaltado', async () => {
    vi.mocked(prestamosApi.buscarActivo).mockResolvedValue({
      ...activo,
      estado: 'VENCIDO',
    })
    const user = abrir()

    await buscar(user)

    expect(await screen.findByText('Vencido')).toBeInTheDocument()
  })

  it('HU-005 #6: código sin préstamo activo muestra el error 404', async () => {
    vi.mocked(prestamosApi.buscarActivo).mockRejectedValue(error404)
    const user = abrir()

    await buscar(user)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No hay un préstamo activo para ese ejemplar',
    )
    expect(
      screen.queryByRole('button', { name: 'Confirmar devolución' }),
    ).not.toBeInTheDocument()
  })
})
