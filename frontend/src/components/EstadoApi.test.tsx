import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import EstadoApi from './EstadoApi'
import { getHealth } from '../services/healthService'

vi.mock('../services/healthService')

describe('EstadoApi', () => {
  it('muestra la API conectada cuando /health responde ok', async () => {
    vi.mocked(getHealth).mockResolvedValue({ status: 'ok' })

    render(<EstadoApi />)

    expect(await screen.findByText('conectada')).toBeInTheDocument()
  })

  it('muestra sin conexión cuando la API falla', async () => {
    vi.mocked(getHealth).mockRejectedValue(new Error('Network Error'))

    render(<EstadoApi />)

    expect(await screen.findByText('sin conexión')).toBeInTheDocument()
  })
})
