/**
 * Niveles solo visuales para leer la tabla de un vistazo; no son una regla de
 * negocio (el reglamento no define penalidades, HU-018 está fuera de alcance).
 */
export const SEVERIDADES = [
  { clase: 'advertencia', nombre: 'Leve', rango: '1 a 3 días', hasta: 3 },
  { clase: 'serio', nombre: 'Moderado', rango: '4 a 7 días', hasta: 7 },
  {
    clase: 'critico',
    nombre: 'Grave',
    rango: '8 días o más',
    hasta: Infinity,
  },
] as const

export function severidad(dias: number) {
  return SEVERIDADES.find((n) => dias <= n.hasta)!
}
