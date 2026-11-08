import '@testing-library/jest-dom/vitest'
import React from 'react'
import { vi } from 'vitest'

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
