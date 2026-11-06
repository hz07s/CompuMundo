/** Token de inyección de la implementación activa de IDniValidator (RNF-11). */
export const DNI_VALIDATOR = Symbol('DNI_VALIDATOR');

/**
 * Contrato de validación de DNI (ADR-011). LectoresService depende solo de
 * esta interfaz, de modo que una validación externa (p. ej. RENIEC) pueda
 * reemplazar la implementación sin tocar el servicio.
 */
export interface IDniValidator {
  validar(dni: string): Promise<boolean>;
}
