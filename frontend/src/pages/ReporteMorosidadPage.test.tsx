import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { reportesApi } from '../features/reportes/reportesApi'
import type { ReporteMorosidad } from '../features/reportes/types'
import ReporteMorosidadPage from './ReporteMorosidadPage'

vi.mock('../features/reportes/reportesApi')

const conDatos: ReporteMorosidad = {
  generadoEn: '2026-11-19T15:00:00.000Z',
  total: 1,
  filas: [
    {
      codigoEjemplar: 'CEDIS-2026-000001',
      titulo: 'Cálculo diferencial',
      lector: 'Ana Quispe',
      dni: '****8912',
      fechaPrestamo: '2026-11-02',
      fechaDevolucion: '2026-11-05',
      diasAtraso: 14,
      registradoPor: 'biblio1',
    },
  ],
}

describe('ReporteMorosidadPage (HU-006, ST-37)', () => {
  beforeEach(() => vi.resetAllMocks())

  it('HU-006 #1 y #4: lista los vencidos con el DNI enmascarado', async () => {
    vi.mocked(reportesApi.morosidad).mockResolvedValue(conDatos)
    render(<ReporteMorosidadPage />)
    expect(await screen.findByText('Cálculo diferencial')).toBeInTheDocument()
    expect(screen.getByText('****8912')).toBeInTheDocument()
    expect(screen.getByText('14')).toBeInTheDocument()
  })

  it('HU-006 #2: el botón Exportar Excel descarga el archivo', async () => {
    vi.mocked(reportesApi.morosidad).mockResolvedValue(conDatos)
    vi.mocked(reportesApi.morosidadExcel).mockResolvedValue(new Blob(['x']))
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()
    const user = userEvent.setup()
    render(<ReporteMorosidadPage />)
    await user.click(
      await screen.findByRole('button', { name: 'Exportar Excel' }),
    )
    expect(reportesApi.morosidadExcel).toHaveBeenCalledOnce()
  })

  it('HU-006 #5: sin vencidos indica que no hay préstamos vencidos', async () => {
    vi.mocked(reportesApi.morosidad).mockResolvedValue({
      generadoEn: conDatos.generadoEn,
      total: 0,
      filas: [],
    })
    render(<ReporteMorosidadPage />)
    expect(
      await screen.findByText('No hay préstamos vencidos'),
    ).toBeInTheDocument()
  })

  it('HU-006 #3: el botón Exportar PDF descarga el archivo', async () => {
    vi.mocked(reportesApi.morosidad).mockResolvedValue(conDatos)
    vi.mocked(reportesApi.morosidadPdf).mockResolvedValue(new Blob(['x']))
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()
    const user = userEvent.setup()
    render(<ReporteMorosidadPage />)
    await user.click(
      await screen.findByRole('button', { name: 'Exportar PDF' }),
    )
    expect(reportesApi.morosidadPdf).toHaveBeenCalledOnce()
  })

  it('D-04: la tabla tiene título accesible y encabezados de columna', async () => {
    vi.mocked(reportesApi.morosidad).mockResolvedValue(conDatos)
    render(<ReporteMorosidadPage />)
    const tabla = await screen.findByRole('table', {
      name: 'Préstamos vencidos (1)',
    })
    expect(tabla).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'DNI' })).toHaveAttribute(
      'scope',
      'col',
    )
  })

  it('D-03: revoca la URL del archivo después del click, no antes', async () => {
    vi.mocked(reportesApi.morosidad).mockResolvedValue(conDatos)
    vi.mocked(reportesApi.morosidadExcel).mockResolvedValue(new Blob(['x']))
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()
    // Una microtarea corre justo después del código síncrono del click: si la
    // URL ya se revocó para entonces, la descarga podría cancelarse.
    let revocadaEnElMismoCiclo: boolean | undefined
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {
        queueMicrotask(() => {
          revocadaEnElMismoCiclo =
            vi.mocked(URL.revokeObjectURL).mock.calls.length > 0
        })
      })
    const user = userEvent.setup()
    render(<ReporteMorosidadPage />)
    await user.click(
      await screen.findByRole('button', { name: 'Exportar Excel' }),
    )
    expect(click).toHaveBeenCalledOnce()
    expect(revocadaEnElMismoCiclo).toBe(false)
    await vi.waitFor(() =>
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:x'),
    )
    click.mockRestore()
  })

  it('D-02: si la descarga falla muestra el mensaje del servidor', async () => {
    vi.mocked(reportesApi.morosidad).mockResolvedValue(conDatos)
    vi.mocked(reportesApi.morosidadPdf).mockRejectedValue(
      Object.assign(new Error('x'), {
        isAxiosError: true,
        response: { status: 401, data: { message: 'Sesión vencida' } },
      }),
    )
    const user = userEvent.setup()
    render(<ReporteMorosidadPage />)
    await user.click(
      await screen.findByRole('button', { name: 'Exportar PDF' }),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('Sesión vencida')
  })

  it('HU-006: muestra "Cargando" y luego el error si la consulta falla', async () => {
    vi.mocked(reportesApi.morosidad).mockRejectedValue(new Error('x'))
    render(<ReporteMorosidadPage />)
    expect(screen.getByText('Cargando reporte…')).toBeInTheDocument()
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.queryByText('Cargando reporte…')).not.toBeInTheDocument()
  })
})
