import { render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation, useRoutes } from 'react-router-dom'
import { rutas } from '../router'

function App() {
  const location = useLocation()
  return (
    <>
      {useRoutes(rutas)}
      <output data-testid="ruta-actual" hidden>
        {location.pathname}
      </output>
    </>
  )
}

/**
 * Renderiza la tabla de rutas real empezando en `ruta`. Usa MemoryRouter en
 * lugar de createMemoryRouter porque el data router de React Router choca en
 * jsdom (AbortSignal de jsdom vs Request de Node).
 */
export function renderConRutas(ruta: string) {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <App />
    </MemoryRouter>,
  )
  return {
    rutaActual: () => screen.getByTestId('ruta-actual').textContent,
  }
}
