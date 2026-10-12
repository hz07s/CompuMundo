import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import HomePage from './HomePage'
import { getHealth } from '../services/healthService'

vi.mock('../services/healthService')

describe('HomePage', () => {
  it('muestra la API conectada cuando /health responde ok', async () => {
    vi.mocked(getHealth).mockResolvedValue({ status: 'ok' })

    render(<HomePage />)

    expect(await screen.findByText('conectada')).toBeInTheDocument()
  })

  it('muestra sin conexión cuando la API falla', async () => {
    vi.mocked(getHealth).mockRejectedValue(new Error('Network Error'))

    render(<HomePage />)

    expect(await screen.findByText('sin conexión')).toBeInTheDocument()
  })
})
