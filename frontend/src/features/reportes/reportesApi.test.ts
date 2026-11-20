import { AxiosError, type AxiosResponse } from 'axios'
import { vi } from 'vitest'
import { api } from '../../services/api'
import { normalizarError } from '../../services/apiError'
import { reportesApi } from './reportesApi'

function errorConCuerpo(status: number, cuerpo: Blob) {
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, null, {
    status,
    data: cuerpo,
  } as AxiosResponse)
}

describe('reportesApi (HU-006, D-02)', () => {
  afterEach(() => vi.restoreAllMocks())

  it('HU-006 #2: descarga el Excel como blob', async () => {
    const archivo = new Blob(['xlsx'])
    vi.spyOn(api, 'get').mockResolvedValue({ data: archivo })

    await expect(reportesApi.morosidadExcel()).resolves.toBe(archivo)
    expect(api.get).toHaveBeenCalledWith('/reportes/morosidad.xlsx', {
      responseType: 'blob',
    })
  })

  it('D-02: un error con cuerpo JSON en Blob llega con el mensaje del servidor', async () => {
    const cuerpo = new Blob(
      [JSON.stringify({ statusCode: 403, message: 'Rol sin permiso' })],
      { type: 'application/json' },
    )
    vi.spyOn(api, 'get').mockRejectedValue(errorConCuerpo(403, cuerpo))

    const error = await reportesApi.morosidadPdf().catch((e: unknown) => e)

    expect(normalizarError(error)).toMatchObject({
      status: 403,
      mensaje: 'Rol sin permiso',
    })
  })

  it('D-02: si el cuerpo no es JSON queda el mensaje genérico', async () => {
    vi.spyOn(api, 'get').mockRejectedValue(
      errorConCuerpo(502, new Blob(['<html>Bad gateway</html>'])),
    )

    const error = await reportesApi.morosidadExcel().catch((e: unknown) => e)

    expect(normalizarError(error)).toMatchObject({
      status: 502,
      mensaje: 'Ocurrió un error inesperado',
    })
  })
})
