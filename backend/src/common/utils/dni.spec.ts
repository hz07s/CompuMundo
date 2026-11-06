import { enmascararDni } from './dni';

describe('enmascararDni', () => {
  it('HU-007: deja visibles solo los últimos 4 dígitos', () => {
    expect(enmascararDni('12345678')).toBe('****5678');
  });

  it('nunca incluye los primeros 4 dígitos', () => {
    expect(enmascararDni('87654321')).not.toContain('8765');
  });
});
