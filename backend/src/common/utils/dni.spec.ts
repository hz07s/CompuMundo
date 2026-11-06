import { enmascararDni, enmascararDnisEnTexto } from './dni';

describe('enmascararDni', () => {
  it('HU-007 #1: 45678912 se presenta como ****8912', () => {
    expect(enmascararDni('45678912')).toBe('****8912');
  });

  it('nunca incluye los primeros 4 dígitos', () => {
    expect(enmascararDni('87654321')).not.toContain('8765');
  });
});

describe('enmascararDnisEnTexto', () => {
  it('HU-007 #7: enmascara un DNI dentro de un mensaje de log', () => {
    expect(enmascararDnisEnTexto('Key (dni)=(45678912) already exists')).toBe(
      'Key (dni)=(****8912) already exists',
    );
  });

  it('enmascara todos los DNI del texto', () => {
    expect(enmascararDnisEnTexto('POST /x?dni=12345678&apo=87654321')).toBe(
      'POST /x?dni=****5678&apo=****4321',
    );
  });

  it('no toca números más cortos ni más largos que un DNI', () => {
    const texto = 'id 1234567 y 123456789 y 2026-11-05';
    expect(enmascararDnisEnTexto(texto)).toBe(texto);
  });

  it('un texto sin DNI queda igual', () => {
    expect(enmascararDnisEnTexto('Error interno')).toBe('Error interno');
  });
});
