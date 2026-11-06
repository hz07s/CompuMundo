import { calcularEdad, esFechaFutura, esMenorDeEdad } from './edad';

describe('edad del lector (RN-09, P-23)', () => {
  const hoy = new Date('2026-11-05T12:00:00Z');

  it.each([
    ['2008-11-05', 18], // cumple 18 hoy
    ['2008-11-06', 17], // cumple 18 mañana
    ['2008-11-04', 18],
    ['2000-01-01', 26],
    ['2026-11-05', 0],
  ])('calcula la edad de quien nació el %s: %i años', (nacimiento, edad) => {
    expect(calcularEdad(nacimiento, hoy)).toBe(edad);
  });

  it('es menor de edad hasta el día anterior a cumplir 18 años', () => {
    expect(esMenorDeEdad('2008-11-06', hoy)).toBe(true);
    expect(esMenorDeEdad('2008-11-05', hoy)).toBe(false);
  });

  it.each(['2026-02-30', '2026-13-01', 'abc'])(
    'una fecha inexistente (%s) no tiene edad ni cuenta como menor',
    (fecha) => {
      expect(calcularEdad(fecha, hoy)).toBeNull();
      expect(esMenorDeEdad(fecha, hoy)).toBe(false);
      expect(esFechaFutura(fecha, hoy)).toBe(false);
    },
  );

  it('una fecha futura no cuenta como menor de edad', () => {
    expect(esMenorDeEdad('2027-01-01', hoy)).toBe(false);
  });

  it('detecta una fecha de nacimiento posterior a hoy', () => {
    expect(esFechaFutura('2027-01-01', hoy)).toBe(true);
    expect(esFechaFutura('2026-11-05', hoy)).toBe(false);
  });
});
