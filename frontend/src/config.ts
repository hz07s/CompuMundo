/**
 * Client ID de Google (HU-022). Si falta, el login con Google no se ofrece:
 * el botón de Google Identity Services fallaría y ensuciaría la consola.
 * Se lee en cada llamada para que las pruebas puedan cambiarlo con vi.stubEnv.
 */
export function googleClientId(): string {
  return (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? ''
}
