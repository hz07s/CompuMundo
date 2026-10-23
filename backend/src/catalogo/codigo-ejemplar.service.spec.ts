import { EntityManager } from 'typeorm';
import {
  anioDeAlta,
  CodigoEjemplarService,
  formatearCodigo,
} from './codigo-ejemplar.service';

describe('CodigoEjemplarService', () => {
  const service = new CodigoEjemplarService();
  const managerQueDevuelve = (ultimo: number) => {
    const query = jest.fn().mockResolvedValue([{ ultimo }]);
    return { manager: { query } as unknown as EntityManager, query };
  };

  it('formatea CEDIS-{AÑO}-{SECUENCIAL de 6 dígitos}', () => {
    expect(formatearCodigo(2026, 1)).toBe('CEDIS-2026-000001');
    expect(formatearCodigo(2026, 123456)).toBe('CEDIS-2026-123456');
  });

  it('devuelve el rango reservado de códigos consecutivos', async () => {
    const { manager, query } = managerQueDevuelve(12);

    const codigos = await service.reservar(
      manager,
      3,
      new Date('2026-06-15T12:00:00Z'),
    );

    expect(codigos).toEqual([
      'CEDIS-2026-000010',
      'CEDIS-2026-000011',
      'CEDIS-2026-000012',
    ]);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT'),
      [2026, 3],
    );
  });

  it.each([0, -1, 1.5])('rechaza la cantidad %p', async (cantidad) => {
    const { manager, query } = managerQueDevuelve(1);

    await expect(service.reservar(manager, cantidad)).rejects.toThrow(
      RangeError,
    );
    expect(query).not.toHaveBeenCalled();
  });

  it('falla si se supera el secuencial máximo del año', async () => {
    const { manager } = managerQueDevuelve(1_000_000);

    await expect(service.reservar(manager, 1)).rejects.toThrow(/agotaron/);
  });

  it('el año es el de Perú aunque en UTC ya sea el siguiente', () => {
    // 31/12/2026 22:00 en Lima = 01/01/2027 03:00 UTC
    expect(anioDeAlta(new Date('2027-01-01T03:00:00Z'))).toBe(2026);
  });
});
