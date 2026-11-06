import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders } from 'axios'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { sesionStore } from '../features/auth/sesionStore'
import type { Rol } from '../features/auth/types'
import { prestamosApi } from '../features/prestamos/prestamosApi'
import type {
  EjemplarConsulta,
  LectorVerificacion,
  PrestamoRegistrado,
} from '../features/prestamos/types'
import PrestamosPage from './PrestamosPage'

vi.mock('../features/prestamos/prestamosApi')

const lectorLibre: LectorVerificacion = {
  id: 'l-1',
  dni: '45678912',
  nombres: 'Ana',
  apellidos: 'Quispe',
  categoria: 'ESTUDIANTE',
  esMenor: false,
  apoderadoNombre: null,
  apoderadoDni: null,
  activo: true,
  tienePrestamoActivo: false,
  morosidad: { estado: 'LIBRE', devolucionesTardias: 0, mensaje: null },
}

const ejemplarDisponible: EjemplarConsulta = {
  id: 'e-1',
  codigo: 'CEDIS-2026-000001',
  estado: 'DISPONIBLE',
  disponible: true,
  obra: { id: 'o-1', titulo: 'Cálculo diferencial' },
}

const prestamo: PrestamoRegistrado = {
  id: 'p-1',
  estado: 'VIGENTE',
  fechaPrestamo: '2026-11-06',
  fechaDevolucion: '2026-11-11',
  justificacion: null,
  ejemplar: { codigo: 'CEDIS-2026-000001', titulo: 'Cálculo diferencial' },
  lector: { nombres: 'Ana', apellidos: 'Quispe', dni: '****8912' },
}

const errorApi = (status: number, message: string) =>
  new AxiosError('error', 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    statusText: 'Error',
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: { statusCode: status, message },
  })

function autenticar(rol: Rol) {
  sesionStore.reiniciar({
    estado: 'autenticado',
    accessToken: 't',
    usuario: { id: 'u-1', nombreUsuario: 'maria', rol },
  })
}

function abrir(rol: Rol = 'BIBLIOTECARIO') {
  autenticar(rol)
  render(
    <MemoryRouter>
      <PrestamosPage />
    </MemoryRouter>,
  )
  return userEvent.setup()
}

async function verificarLector(
  user: ReturnType<typeof userEvent.setup>,
  dni = '45678912',
) {
  await user.type(screen.getByLabelText('DNI del lector'), dni)
  await user.click(screen.getByRole('button', { name: 'Verificar lector' }))
}

async function consultarEjemplar(
  user: ReturnType<typeof userEvent.setup>,
  codigo = 'CEDIS-2026-000001',
) {
  await user.type(screen.getByLabelText('Código del ejemplar'), codigo)
  await user.click(screen.getByRole('button', { name: 'Consultar ejemplar' }))
}

const botonRegistrar = () =>
  screen.getByRole('button', { name: 'Registrar préstamo' })

describe('PrestamosPage (HU-004, ST-30)', () => {
  beforeEach(() => {
    vi.mocked(prestamosApi.verificarLector).mockResolvedValue(lectorLibre)
    vi.mocked(prestamosApi.consultarEjemplar).mockResolvedValue(
      ejemplarDisponible,
    )
  })

  it('HU-004 #1: préstamo exitoso muestra la confirmación con la fecha de devolución', async () => {
    vi.mocked(prestamosApi.registrar).mockResolvedValue(prestamo)
    const user = abrir()

    await verificarLector(user)
    await consultarEjemplar(user)
    await user.click(botonRegistrar())

    const confirmacion = await screen.findByRole('status', {
      name: 'Préstamo registrado',
    })
    expect(
      within(confirmacion).getByTestId('fecha-devolucion'),
    ).toHaveTextContent('11/11/2026')
    expect(confirmacion).toHaveTextContent('Estado: Vigente')
    expect(prestamosApi.registrar).toHaveBeenCalledWith({
      lectorId: 'l-1',
      codigoEjemplar: 'CEDIS-2026-000001',
    })
  })

  it('HU-007 #2: la verificación presencial muestra el DNI completo; la confirmación, enmascarado', async () => {
    vi.mocked(prestamosApi.registrar).mockResolvedValue(prestamo)
    const user = abrir()

    await verificarLector(user)
    expect(await screen.findByTestId('dni-verificado')).toHaveTextContent(
      '45678912',
    )

    await consultarEjemplar(user)
    await user.click(botonRegistrar())
    const confirmacion = await screen.findByRole('status', {
      name: 'Préstamo registrado',
    })
    expect(confirmacion).toHaveTextContent('****8912')
    // Al terminar, el DNI completo ya no está en pantalla.
    expect(screen.queryByTestId('dni-verificado')).not.toBeInTheDocument()
    expect(document.body).not.toHaveTextContent('45678912')
  })

  it('el botón de registrar está deshabilitado hasta verificar al lector y consultar el ejemplar', async () => {
    const user = abrir()
    expect(botonRegistrar()).toBeDisabled()

    await verificarLector(user)
    await screen.findByTestId('dni-verificado')
    expect(botonRegistrar()).toBeDisabled()

    await consultarEjemplar(user)
    await screen.findByText('Disponible')
    expect(botonRegistrar()).toBeEnabled()
  })

  it('un DNI con formato inválido no se envía', async () => {
    const user = abrir()

    await verificarLector(user, '123')

    expect(
      screen.getByText('El DNI debe tener exactamente 8 dígitos numéricos'),
    ).toBeInTheDocument()
    expect(prestamosApi.verificarLector).not.toHaveBeenCalled()
  })

  it('HU-004 #3 (A2): un lector no registrado indica que debe registrarlo primero', async () => {
    vi.mocked(prestamosApi.verificarLector).mockRejectedValue(
      errorApi(404, 'El lector no está registrado. Debe registrarlo primero'),
    )
    const user = abrir()

    await verificarLector(user)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Debe registrarlo primero',
    )
    expect(
      screen.getByRole('link', { name: 'Registrar al lector' }),
    ).toHaveAttribute('href', '/lectores')
    expect(botonRegistrar()).toBeDisabled()
  })

  it('HU-004 #2 (A1): un ejemplar prestado se señala y no permite registrar', async () => {
    vi.mocked(prestamosApi.consultarEjemplar).mockResolvedValue({
      ...ejemplarDisponible,
      estado: 'PRESTADO',
      disponible: false,
    })
    const user = abrir()

    await verificarLector(user)
    await consultarEjemplar(user)

    expect(
      await screen.findByText(
        'El ejemplar no está disponible: ya está prestado.',
      ),
    ).toBeInTheDocument()
    expect(botonRegistrar()).toBeDisabled()
  })

  it('un código de ejemplar inexistente muestra el error del servidor', async () => {
    vi.mocked(prestamosApi.consultarEjemplar).mockRejectedValue(
      errorApi(404, 'Ejemplar no encontrado'),
    )
    const user = abrir()

    await consultarEjemplar(user, 'NO-EXISTE')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ejemplar no encontrado',
    )
  })

  it('HU-004 #4 (RN-08): un lector con préstamo activo no puede recibir otro', async () => {
    vi.mocked(prestamosApi.verificarLector).mockResolvedValue({
      ...lectorLibre,
      tienePrestamoActivo: true,
    })
    const user = abrir()

    await verificarLector(user)
    await consultarEjemplar(user)

    expect(
      await screen.findByText(/ya tiene un préstamo activo/),
    ).toBeInTheDocument()
    expect(botonRegistrar()).toBeDisabled()
  })

  describe('RN-02: morosidad', () => {
    const advertencia: LectorVerificacion = {
      ...lectorLibre,
      morosidad: {
        estado: 'ADVERTENCIA',
        devolucionesTardias: 1,
        mensaje: 'El lector devolvió tarde su último préstamo.',
      },
    }

    it('HU-004 #5: la advertencia exige una justificación escrita antes de registrar', async () => {
      vi.mocked(prestamosApi.verificarLector).mockResolvedValue(advertencia)
      vi.mocked(prestamosApi.registrar).mockResolvedValue({
        ...prestamo,
        justificacion: 'Trae la autorización de la dirección',
      })
      const user = abrir()

      await verificarLector(user)
      await consultarEjemplar(user)
      expect(await screen.findByText(/devolvió tarde/)).toBeInTheDocument()

      await user.click(botonRegistrar())
      expect(
        screen.getByText('La justificación escrita es obligatoria'),
      ).toBeInTheDocument()
      expect(prestamosApi.registrar).not.toHaveBeenCalled()

      await user.type(
        screen.getByLabelText('Justificación'),
        'Trae la autorización de la dirección',
      )
      await user.click(botonRegistrar())

      await screen.findByRole('status', { name: 'Préstamo registrado' })
      expect(prestamosApi.registrar).toHaveBeenCalledWith({
        lectorId: 'l-1',
        codigoEjemplar: 'CEDIS-2026-000001',
        justificacion: 'Trae la autorización de la dirección',
      })
    })

    const bloqueado: LectorVerificacion = {
      ...lectorLibre,
      morosidad: {
        estado: 'BLOQUEADO',
        devolucionesTardias: 2,
        mensaje: 'Solo un Administrador puede desbloquearlo',
      },
    }

    it('HU-004 #6: el Bibliotecario ve el bloqueo, no puede registrar ni desbloquear', async () => {
      vi.mocked(prestamosApi.verificarLector).mockResolvedValue(bloqueado)
      const user = abrir('BIBLIOTECARIO')

      await verificarLector(user)
      await consultarEjemplar(user)

      expect(
        await screen.findByText(/Solo un Administrador puede desbloquearlo/),
      ).toBeInTheDocument()
      expect(botonRegistrar()).toBeDisabled()
      expect(
        screen.queryByRole('button', { name: 'Desbloquear lector' }),
      ).not.toBeInTheDocument()
    })

    it('HU-004 #7: el Administrador desbloquea con un motivo y se vuelve a verificar', async () => {
      vi.mocked(prestamosApi.verificarLector)
        .mockResolvedValueOnce(bloqueado)
        .mockResolvedValueOnce(lectorLibre)
      vi.mocked(prestamosApi.desbloquearLector).mockResolvedValue()
      const user = abrir('ADMINISTRADOR')

      await verificarLector(user)
      await user.click(
        await screen.findByRole('button', { name: 'Desbloquear lector' }),
      )
      expect(
        screen.getByText('El motivo del desbloqueo es obligatorio'),
      ).toBeInTheDocument()
      expect(prestamosApi.desbloquearLector).not.toHaveBeenCalled()

      await user.type(
        screen.getByLabelText('Motivo del desbloqueo'),
        'Regularizó',
      )
      await user.click(
        screen.getByRole('button', { name: 'Desbloquear lector' }),
      )

      await waitFor(() =>
        expect(prestamosApi.desbloquearLector).toHaveBeenCalledWith(
          'l-1',
          'Regularizó',
        ),
      )
      await waitFor(() =>
        expect(
          screen.queryByRole('button', { name: 'Desbloquear lector' }),
        ).not.toBeInTheDocument(),
      )
    })
  })

  it('el Administrador consulta al lector pero no ve el botón de registrar', async () => {
    const user = abrir('ADMINISTRADOR')

    await verificarLector(user)

    expect(await screen.findByTestId('dni-verificado')).toHaveTextContent(
      '45678912',
    )
    expect(
      screen.queryByRole('button', { name: 'Registrar préstamo' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByText(/solo el\s+Bibliotecario registra/),
    ).toBeInTheDocument()
  })

  it('muestra el error del servidor si el registro falla', async () => {
    vi.mocked(prestamosApi.registrar).mockRejectedValue(
      errorApi(409, 'El ejemplar no está disponible'),
    )
    const user = abrir()

    await verificarLector(user)
    await consultarEjemplar(user)
    await screen.findByText('Disponible')
    await user.click(botonRegistrar())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El ejemplar no está disponible',
    )
    expect(
      screen.queryByRole('status', { name: 'Préstamo registrado' }),
    ).not.toBeInTheDocument()
  })
})
