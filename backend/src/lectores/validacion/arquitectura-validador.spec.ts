import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * HU-003 #4: el módulo de lectores valida el DNI solo mediante IDniValidator.
 * Estas comprobaciones fallan si alguien acopla el servicio a una implementación
 * concreta, lo que impediría reemplazarla (RNF-11).
 */
describe('Desacoplamiento de IDniValidator (RNF-11)', () => {
  const leer = (...partes: string[]) =>
    readFileSync(join(__dirname, '..', ...partes), 'utf8');

  it('HU-003 #4: LectoresService no importa ninguna implementación concreta', () => {
    const servicio = leer('lectores.service.ts');

    expect(servicio).not.toMatch(/formato-dni\.validator|FormatoDniValidator/);
    expect(servicio).toContain("from './validacion/dni-validator.interface'");
    expect(servicio).toContain('@Inject(DNI_VALIDATOR)');
  });

  it('HU-003 #4: la implementación de la Release 1 se elige solo en LectoresModule', () => {
    const modulo = leer('lectores.module.ts');

    expect(modulo).toMatch(
      /provide: DNI_VALIDATOR,\s*useClass: FormatoDniValidator/,
    );
  });

  it('HU-003 #4: la implementación de la Release 1 no consulta servicios externos', () => {
    const impl = leer('validacion', 'formato-dni.validator.ts');

    expect(impl).not.toMatch(/fetch|axios|http|https|HttpService|reniec/i);
  });
});
