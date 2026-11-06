import { DiasHabilesService, hoyEnLima } from './dias-habiles.service';

describe('DiasHabilesService (RN-01, ADR-008)', () => {
  const servicio = new DiasHabilesService();

  it('HU-004: un lunes sin feriados vence el jueves (3 días hábiles)', () => {
    expect(servicio.sumar('2026-11-09')).toBe('2026-11-12');
  });

  it('HU-004: el plazo excluye fines de semana (viernes → miércoles)', () => {
    // Viernes 6/nov/2026: sáb y dom no cuentan; lun 9, mar 10, mié 11.
    expect(servicio.sumar('2026-11-06')).toBe('2026-11-11');
  });

  it('un préstamo en sábado o domingo cuenta desde el siguiente día hábil', () => {
    expect(servicio.sumar('2026-11-07')).toBe('2026-11-11');
    expect(servicio.sumar('2026-11-08')).toBe('2026-11-11');
  });

  it('HU-004: el plazo excluye feriados nacionales', () => {
    // Mié 7/oct/2026: el jue 8 es feriado (Combate de Angamos).
    // Cuentan vie 9 (1), lun 12 (2) y mar 13 (3).
    expect(servicio.sumar('2026-10-07')).toBe('2026-10-13');
  });

  it('salta feriados consecutivos (8 y 9 de diciembre) y el fin de semana', () => {
    // Lun 7/dic/2026: mar 8 y mié 9 son feriados; cuentan jue 10, vie 11 y lun 14.
    expect(servicio.sumar('2026-12-07')).toBe('2026-12-14');
  });

  it('cruza el fin de año con el feriado de Año Nuevo', () => {
    // Mié 30/dic/2026: jue 31 (1), vie 1/ene feriado, lun 4 (2), mar 5 (3).
    expect(servicio.sumar('2026-12-30')).toBe('2027-01-05');
  });

  it('el plazo por defecto es de 3 días hábiles y se puede indicar otro', () => {
    expect(servicio.sumar('2026-11-09', 1)).toBe('2026-11-10');
    expect(servicio.sumar('2026-11-09', 0)).toBe('2026-11-09');
    expect(servicio.sumar('2026-11-09', 5)).toBe('2026-11-16');
  });

  it.each(['09/11/2026', '2026-13-01', '2026-02-30', ''])(
    'rechaza la fecha inválida %p',
    (fecha) => {
      expect(() => servicio.sumar(fecha)).toThrow(RangeError);
    },
  );

  it.each([-1, 1.5, Number.NaN])('rechaza los días hábiles %p', (dias) => {
    expect(() => servicio.sumar('2026-11-09', dias)).toThrow(RangeError);
  });

  it('esHabil distingue laborables, fines de semana y feriados', () => {
    expect(servicio.esHabil(new Date('2026-11-09T12:00:00Z'))).toBe(true);
    expect(servicio.esHabil(new Date('2026-11-07T12:00:00Z'))).toBe(false);
    expect(servicio.esHabil(new Date('2026-12-25T12:00:00Z'))).toBe(false);
  });
});

describe('hoyEnLima', () => {
  it('usa el día calendario de Lima (UTC-5), no el de UTC', () => {
    // 02:00 UTC del 10/nov todavía es 9/nov 21:00 en Lima.
    expect(hoyEnLima(new Date('2026-11-10T02:00:00Z'))).toBe('2026-11-09');
    expect(hoyEnLima(new Date('2026-11-10T06:00:00Z'))).toBe('2026-11-10');
  });

  it('sin argumento devuelve una fecha AAAA-MM-DD', () => {
    expect(hoyEnLima()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
