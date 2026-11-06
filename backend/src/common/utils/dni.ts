/** Enmascara un DNI dejando visibles solo los últimos 4 dígitos (RNF-02, HU-007). */
export function enmascararDni(dni: string): string {
  return `****${dni.slice(-4)}`;
}
