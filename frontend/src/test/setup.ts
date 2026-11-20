import '@testing-library/jest-dom/vitest'
import React from 'react'
import { vi } from 'vitest'

// Las pruebas de HU-022 necesitan el botón de Google; LoginPage lo oculta sin client ID.
vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'client-id-de-prueba')

vi.mock('@react-oauth/google', () => ({
  GoogleOAuthProvider: ({ children }: { children: React.ReactNode }) =>
    children,
  GoogleLogin: ({
    onSuccess,
  }: {
    onSuccess?: (res: { credential: string }) => void
    onError?: () => void
  }) =>
    React.createElement(
      'button',
      {
        type: 'button',
        'data-testid': 'google-login-btn',
        onClick: () => onSuccess?.({ credential: 'google-test-credential' }),
      },
      'Sign in with Google',
    ),
  useGoogleLogin: () => vi.fn(),
}))
