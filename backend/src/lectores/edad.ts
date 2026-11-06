import { EDAD_MAYORIA } from './entities/lector.entity';

/** Parsea AAAA-MM-DD como fecha UTC; devuelve null si no existe en el calendario. */
function parsear(fecha: string): Date | null {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const f = new Date(Date.UTC(anio, mes - 1, dia));
  const valida =
    f.getUTCFullYear() === anio &&
    f.getUTCMonth() === mes - 1 &&
    f.getUTCDate() === dia;
  return valida ? f : null;
}

/** Años cumplidos a la fecha `hoy` (UTC); null si la fecha es inválida. */
export function calcularEdad(
  fechaNacimiento: string,
  hoy: Date,
): number | null {
  const nacimiento = parsear(fechaNacimiento);
  if (!nacimiento) return null;
  let edad = hoy.getUTCFullYear() - nacimiento.getUTCFullYear();
  const aunNoCumple =
    hoy.getUTCMonth() < nacimiento.getUTCMonth() ||
    (hoy.getUTCMonth() === nacimiento.getUTCMonth() &&
      hoy.getUTCDate() < nacimiento.getUTCDate());
  if (aunNoCumple) edad -= 1;
  return edad;
}

export function esMenorDeEdad(fechaNacimiento: string, hoy: Date): boolean {
  const edad = calcularEdad(fechaNacimiento, hoy);
  // Una fecha futura (edad negativa) no es de un menor: se rechaza aparte.
  return edad !== null && edad >= 0 && edad < EDAD_MAYORIA;
}

export function esFechaFutura(fechaNacimiento: string, hoy: Date): boolean {
  const f = parsear(fechaNacimiento);
  return f !== null && f.getTime() > hoy.getTime();
}
