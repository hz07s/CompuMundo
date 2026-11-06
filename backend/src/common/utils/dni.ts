/** Enmascara un DNI dejando visibles solo los últimos 4 dígitos (RNF-02, HU-007). */
export function enmascararDni(dni: string): string {
  return `****${dni.slice(-4)}`;
}

const DNI_EN_TEXTO = /(?<!\d)\d{8}(?!\d)/g;

/**
 * Enmascara cualquier DNI (8 dígitos seguidos) que aparezca dentro de un texto.
 * Se aplica a todo lo que se escribe en los logs (RNF-02).
 */
export function enmascararDnisEnTexto(texto: string): string {
  return texto.replace(DNI_EN_TEXTO, (dni) => enmascararDni(dni));
}
