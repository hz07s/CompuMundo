import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders } from 'axios'
import { vi } from 'vitest'
import { lectoresApi } from '../features/lectores/lectoresApi'
import type { LectorRegistrado } from '../features/lectores/types'
import LectoresPage from './LectoresPage'

vi.mock('../features/lectores/lectoresApi')

const registrado: LectorRegistrado = {
  id: 'l-1',
  dni: '****5678',
  nombres: 'Ana',
  apellidos: 'Quispe',
  categoria: 'ESTUDIANTE',
  fechaNacimiento: '2000-05-10',
  esMenor: false,
  apoderadoNombre: null,
  apoderadoDni: null,
  consentimientoApoderado: false,
  activo: true,
  creadoEn: '2026-11-05T00:00:00Z',
}

const errorApi = (
  status: number,
  data: { message: string; errors?: Record<string, string[]> },
) =>
  new AxiosError('error', 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    statusText: 'Error',
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: { statusCode: status, ...data },
  })

/** Fecha AAAA-MM-DD de alguien con `anios` años cumplidos hoy. */
function nacidoHaceAnios(anios: number) {
  const f = new Date()
  f.setFullYear(f.getFullYear() - anios)
  const mes = String(f.getMonth() + 1).padStart(2, '0')
  const dia = String(f.getDate()).padStart(2, '0')
  return `${f.getFullYear()}-${mes}-${dia}`
}

describe('LectoresPage (HU-003)', () => {
  async function llenar(
    datos: Partial<{
      dni: string
      nombres: string
      apellidos: string
      categoria: string
      fecha: string
    }>,
  ) {
    const user = userEvent.setup()
    if (datos.dni) await user.type(screen.getByLabelText('DNI'), datos.dni)
    if (datos.nombres) {
      await user.type(screen.getByLabelText('Nombres'), datos.nombres)
    }
    if (datos.apellidos) {
      await user.type(screen.getByLabelText('Apellidos'), datos.apellidos)
    }
    if (datos.categoria) {
      await user.selectOptions(
        screen.getByLabelText('Categoría'),
        datos.categoria,
      )
    }
    if (datos.fecha) {
      await user.type(screen.getByLabelText('Fecha de nacimiento'), datos.fecha)
    }
    return user
  }

  const enviar = (user: ReturnType<typeof userEvent.setup>) =>
    user.click(screen.getByRole('button', { name: 'Registrar lector' }))

  const mayor = {
    dni: '12345678',
    nombres: 'Ana',
    apellidos: 'Quispe',
    categoria: 'ESTUDIANTE',
    fecha: '2000-05-10',
  }

  it('HU-003 #1: el registro de un mayor de edad muestra al lector con el DNI enmascarado', async () => {
    vi.mocked(lectoresApi.crear).mockResolvedValue(registrado)
    render(<LectoresPage />)

    const user = await llenar(mayor)
    await enviar(user)

    const resultado = await screen.findByRole('status', {
      name: 'Lector registrado',
    })
    expect(within(resultado).getByTestId('dni-enmascarado')).toHaveTextContent(
      '****5678',
    )
    expect(resultado).not.toHaveTextContent('12345678')
    expect(lectoresApi.crear).toHaveBeenCalledWith({
      dni: '12345678',
      nombres: 'Ana',
      apellidos: 'Quispe',
      categoria: 'ESTUDIANTE',
      fechaNacimiento: '2000-05-10',
    })
  })

  it.each(['1234567', '123456a8', '12345'])(
    'HU-003 #2: el DNI %p se rechaza en su campo y no se envía',
    async (dni) => {
      render(<LectoresPage />)

      const user = await llenar({ ...mayor, dni })
      await enviar(user)

      expect(
        screen.getByText('El DNI debe tener exactamente 8 dígitos numéricos'),
      ).toBeInTheDocument()
      expect(screen.getByLabelText('DNI')).toHaveAttribute(
        'aria-invalid',
        'true',
      )
      expect(lectoresApi.crear).not.toHaveBeenCalled()
    },
  )

  it('HU-003: los campos obligatorios omitidos se señalan cada uno en su campo', async () => {
    render(<LectoresPage />)

    await enviar(userEvent.setup())

    for (const mensaje of [
      'El DNI es obligatorio',
      'Los nombres son obligatorios',
      'Los apellidos son obligatorios',
      'La categoría es obligatoria',
      'La fecha de nacimiento es obligatoria',
    ]) {
      expect(screen.getByText(mensaje)).toBeInTheDocument()
    }
    expect(lectoresApi.crear).not.toHaveBeenCalled()
  })

  it('HU-003 #3: un DNI repetido (409) se muestra junto al campo DNI', async () => {
    vi.mocked(lectoresApi.crear).mockRejectedValue(
      errorApi(409, { message: 'El DNI ya está registrado' }),
    )
    render(<LectoresPage />)

    const user = await llenar(mayor)
    await enviar(user)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El DNI ya está registrado',
    )
    expect(screen.getByLabelText('DNI')).toHaveAttribute('aria-invalid', 'true')
  })

  it('la sección del apoderado solo aparece cuando el lector es menor de 18 años', async () => {
    render(<LectoresPage />)
    const user = userEvent.setup()
    const fecha = screen.getByLabelText('Fecha de nacimiento')

    expect(screen.queryByLabelText('DNI del apoderado')).not.toBeInTheDocument()

    await user.type(fecha, nacidoHaceAnios(12))
    expect(screen.getByLabelText('DNI del apoderado')).toBeInTheDocument()

    await user.clear(fecha)
    await user.type(fecha, nacidoHaceAnios(18))
    expect(screen.queryByLabelText('DNI del apoderado')).not.toBeInTheDocument()
  })

  it('HU-003 #5: registra al menor con los datos del apoderado y el consentimiento', async () => {
    const fecha = nacidoHaceAnios(12)
    vi.mocked(lectoresApi.crear).mockResolvedValue({
      ...registrado,
      fechaNacimiento: fecha,
      esMenor: true,
      apoderadoNombre: 'Rosa Mamani',
      apoderadoDni: '****4321',
      consentimientoApoderado: true,
    })
    render(<LectoresPage />)

    const user = await llenar({ ...mayor, fecha })
    await user.type(screen.getByLabelText('DNI del apoderado'), '87654321')
    await user.type(
      screen.getByLabelText('Nombre del apoderado'),
      'Rosa Mamani',
    )
    await user.click(
      screen.getByLabelText('Consentimiento firmado del apoderado recibido'),
    )
    await enviar(user)

    const resultado = await screen.findByRole('status', {
      name: 'Lector registrado',
    })
    expect(resultado).toHaveTextContent('Rosa Mamani')
    expect(resultado).toHaveTextContent('****4321')
    expect(lectoresApi.crear).toHaveBeenCalledWith(
      expect.objectContaining({
        apoderadoDni: '87654321',
        apoderadoNombre: 'Rosa Mamani',
        consentimientoApoderado: true,
      }),
    )
  })

  it('HU-003 #6: un menor sin apoderado ni consentimiento no se envía y se señala cada dato', async () => {
    render(<LectoresPage />)

    const user = await llenar({ ...mayor, fecha: nacidoHaceAnios(10) })
    await enviar(user)

    expect(
      screen.getByText('El DNI del apoderado es obligatorio'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('El nombre del apoderado es obligatorio'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'El consentimiento firmado del apoderado es obligatorio',
      ),
    ).toBeInTheDocument()
    expect(lectoresApi.crear).not.toHaveBeenCalled()
  })

  it('HU-003 #5: el DNI del apoderado se valida con el mismo formato', async () => {
    render(<LectoresPage />)

    const user = await llenar({ ...mayor, fecha: nacidoHaceAnios(10) })
    await user.type(screen.getByLabelText('DNI del apoderado'), '123')
    await enviar(user)

    expect(
      screen.getByText('El DNI debe tener exactamente 8 dígitos numéricos'),
    ).toBeInTheDocument()
  })

  it('muestra junto a cada campo los errores que devuelve el servidor', async () => {
    vi.mocked(lectoresApi.crear).mockRejectedValue(
      errorApi(400, {
        message: 'Datos inválidos',
        errors: { nombres: ['Los nombres admiten hasta 100 caracteres'] },
      }),
    )
    render(<LectoresPage />)

    const user = await llenar(mayor)
    await enviar(user)

    expect(
      await screen.findByText('Los nombres admiten hasta 100 caracteres'),
    ).toBeInTheDocument()
  })

  it('rechaza una fecha de nacimiento futura', async () => {
    render(<LectoresPage />)

    const user = await llenar({ ...mayor, fecha: '2999-01-01' })
    await enviar(user)

    expect(
      screen.getByText('La fecha de nacimiento no puede ser posterior a hoy'),
    ).toBeInTheDocument()
    expect(lectoresApi.crear).not.toHaveBeenCalled()
  })
})
