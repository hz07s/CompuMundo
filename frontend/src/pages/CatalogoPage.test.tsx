import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders } from 'axios'
import { vi } from 'vitest'
import { obrasApi } from '../features/catalogo/obrasApi'
import type { ObraDetalle } from '../features/catalogo/types'
import CatalogoPage from './CatalogoPage'

vi.mock('../features/catalogo/obrasApi')

const obraCreada: ObraDetalle = {
  id: 'o-1',
  titulo: 'Cálculo diferencial',
  categoria: 'Matemáticas',
  autores: ['James Stewart'],
  fechaPublicacion: '2012-01-15',
  totalEjemplares: 3,
  disponibilidad: 3,
  creadoEn: '2026-10-22T00:00:00Z',
  ejemplares: [1, 2, 3].map((n) => ({
    id: `e-${n}`,
    codigo: `CEDIS-2026-00000${n}`,
    estado: 'DISPONIBLE' as const,
  })),
}

const error400 = (errors: Record<string, string[]>) =>
  new AxiosError('400', 'ERR_BAD_REQUEST', undefined, undefined, {
    status: 400,
    statusText: 'Bad Request',
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: { statusCode: 400, message: 'Datos inválidos', errors },
  })

describe('CatalogoPage (HU-002)', () => {
  beforeEach(() => {
    vi.mocked(obrasApi.listar).mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
    })
  })

  async function llenar(
    datos: Partial<{
      titulo: string
      categoria: string
      autor: string
      fecha: string
      cantidad: string
    }>,
  ) {
    const user = userEvent.setup()
    if (datos.titulo)
      await user.type(screen.getByLabelText('Título'), datos.titulo)
    if (datos.categoria) {
      await user.type(screen.getByLabelText('Categoría'), datos.categoria)
    }
    if (datos.autor)
      await user.type(screen.getByLabelText('Autor 1'), datos.autor)
    if (datos.fecha) {
      await user.type(
        screen.getByLabelText('Fecha de publicación'),
        datos.fecha,
      )
    }
    if (datos.cantidad !== undefined) {
      const cantidad = screen.getByLabelText('Cantidad de ejemplares')
      await user.clear(cantidad)
      if (datos.cantidad) await user.type(cantidad, datos.cantidad)
    }
    await user.click(screen.getByRole('button', { name: 'Registrar obra' }))
  }

  const completa = {
    titulo: 'Cálculo diferencial',
    categoria: 'Matemáticas',
    autor: 'James Stewart',
    fecha: '2012-01-15',
    cantidad: '3',
  }

  it('HU-002 #1: el registro correcto muestra los códigos y la disponibilidad', async () => {
    vi.mocked(obrasApi.crear).mockResolvedValue(obraCreada)
    render(<CatalogoPage />)

    await llenar(completa)

    const resultado = await screen.findByRole('status', {
      name: 'Obra registrada',
    })
    expect(within(resultado).getByTestId('disponibilidad')).toHaveTextContent(
      '3',
    )
    for (const n of [1, 2, 3]) {
      expect(
        within(resultado).getByText(`CEDIS-2026-00000${n}`),
      ).toBeInTheDocument()
    }
    expect(obrasApi.crear).toHaveBeenCalledWith({
      titulo: 'Cálculo diferencial',
      categoria: 'Matemáticas',
      autores: ['James Stewart'],
      fechaPublicacion: '2012-01-15',
      cantidad: 3,
    })
    // El listado se recarga para incluir la obra nueva.
    await waitFor(() => expect(obrasApi.listar).toHaveBeenCalledTimes(2))
  })

  it('HU-002 #2: los campos faltantes se señalan en su campo y no se envía nada', async () => {
    render(<CatalogoPage />)

    await llenar({ cantidad: '2' })

    expect(screen.getByText('El título es obligatorio')).toBeInTheDocument()
    expect(screen.getByText('La categoría es obligatoria')).toBeInTheDocument()
    expect(screen.getByText('Indique al menos un autor')).toBeInTheDocument()
    expect(
      screen.getByText('La fecha de publicación es obligatoria'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Título')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(obrasApi.crear).not.toHaveBeenCalled()
  })

  it.each([
    ['0', 'La cantidad debe ser mayor que 0'],
    ['-1', 'La cantidad debe ser mayor que 0'],
    ['', 'La cantidad es obligatoria'],
  ])(
    'HU-002 #3: la cantidad %p se rechaza en el campo cantidad',
    async (cantidad, mensaje) => {
      render(<CatalogoPage />)

      await llenar({ ...completa, cantidad })

      expect(screen.getByText(mensaje)).toBeInTheDocument()
      expect(screen.getByLabelText('Cantidad de ejemplares')).toHaveAttribute(
        'aria-invalid',
        'true',
      )
      expect(obrasApi.crear).not.toHaveBeenCalled()
    },
  )

  it('muestra junto a cada campo los errores que devuelve el servidor', async () => {
    vi.mocked(obrasApi.crear).mockRejectedValue(
      error400({ cantidad: ['La cantidad debe ser un número entero'] }),
    )
    render(<CatalogoPage />)

    await llenar(completa)

    expect(
      await screen.findByText('La cantidad debe ser un número entero'),
    ).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Datos inválidos')
  })

  it('permite agregar y quitar autores', async () => {
    const user = userEvent.setup()
    render(<CatalogoPage />)

    await user.click(screen.getByRole('button', { name: 'Agregar autor' }))
    expect(screen.getByLabelText('Autor 2')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Quitar autor 2' }))
    expect(screen.queryByLabelText('Autor 2')).not.toBeInTheDocument()
  })

  it('lista las obras registradas con su disponibilidad y paginación', async () => {
    vi.mocked(obrasApi.listar).mockResolvedValue({
      data: [obraCreada],
      total: 25,
      page: 1,
      limit: 10,
    })
    const user = userEvent.setup()
    render(<CatalogoPage />)

    expect(await screen.findByText('3 / 3')).toBeInTheDocument()
    expect(screen.getByText('Página 1 de 3')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(obrasApi.listar).toHaveBeenLastCalledWith(2, 10))
  })
})
