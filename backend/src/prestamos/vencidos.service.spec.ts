import { DataSource } from 'typeorm';
import { EstadoPrestamo } from './entities/prestamo.entity';
import { VencidosService } from './vencidos.service';

describe('VencidosService (HU-005, RN-06)', () => {
  const builder = {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    execute: jest.fn(),
  };
  let servicio: VencidosService;

  beforeEach(() => {
    jest.clearAllMocks();
    builder.execute.mockResolvedValue({ affected: 3 });
    servicio = new VencidosService({
      createQueryBuilder: () => builder,
    } as unknown as DataSource);
  });

  it('HU-005 #2: marca como Vencido solo los Vigentes y devuelve la cantidad', async () => {
    const marcados = await servicio.marcar(new Date('2026-11-12T15:00:00Z'));

    expect(marcados).toBe(3);
    expect(builder.set).toHaveBeenCalledWith({
      estado: EstadoPrestamo.VENCIDO,
    });
    expect(builder.where).toHaveBeenCalledWith('estado = :vigente', {
      vigente: EstadoPrestamo.VIGENTE,
    });
  });

  it('HU-005 #8: compara con la fecha de hoy en Lima, con "anterior a" estricto', async () => {
    // 01:00 UTC del 12/11 sigue siendo 11/11 en Lima.
    await servicio.marcar(new Date('2026-11-12T01:00:00Z'));

    expect(builder.andWhere).toHaveBeenCalledWith('fecha_devolucion < :hoy', {
      hoy: '2026-11-11',
    });
  });

  it('HU-005 #4: sin filas afectadas devuelve 0 (idempotente)', async () => {
    builder.execute.mockResolvedValue({ affected: undefined });

    await expect(servicio.marcar()).resolves.toBe(0);
  });

  it('RN-06b: al arrancar recupera el marcado perdido y un fallo no tumba la app', async () => {
    await servicio.onApplicationBootstrap();
    expect(builder.execute).toHaveBeenCalledTimes(1);

    builder.execute.mockRejectedValue(new Error('BD caída'));
    await expect(servicio.onApplicationBootstrap()).resolves.toBeUndefined();
  });
});
