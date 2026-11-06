import { DNI_VALIDATOR, IDniValidator } from './dni-validator.interface';
import { FormatoDniValidator } from './formato-dni.validator';

describe('FormatoDniValidator', () => {
  const validator = new FormatoDniValidator();

  it.each(['12345678', '00000000', '87654321'])(
    'HU-003 #1: acepta el DNI de 8 dígitos %p',
    async (dni) => {
      await expect(validator.validar(dni)).resolves.toBe(true);
    },
  );

  it.each([
    ['', 'vacío'],
    ['1234567', '7 dígitos'],
    ['123456789', '9 dígitos'],
    ['1234567a', 'con una letra'],
    ['abcdefgh', 'solo letras'],
    [' 12345678', 'con espacio al inicio'],
    ['12345678 ', 'con espacio al final'],
    ['1234-678', 'con guion'],
    ['12345678\n', 'con salto de línea'],
    ['１２３４５６７８', 'con dígitos de ancho completo'],
  ])('HU-003 #2: rechaza el DNI %p (%s)', async (dni) => {
    await expect(validator.validar(dni)).resolves.toBe(false);
  });

  const noTexto: unknown[] = [undefined, null, 12345678, {}];
  it.each(noTexto)(
    'HU-003 #2: rechaza un valor que no es texto (%p)',
    async (valor) => {
      await expect(validator.validar(valor as string)).resolves.toBe(false);
    },
  );

  it('HU-003 #4: se expone bajo el token DNI_VALIDATOR como IDniValidator', () => {
    const comoInterfaz: IDniValidator = validator;

    expect(typeof DNI_VALIDATOR).toBe('symbol');
    expect(typeof comoInterfaz.validar).toBe('function');
  });
});
