import { ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Ejemplar, EstadoEjemplar } from '../catalogo/entities/ejemplar.entity';
import { Obra } from '../catalogo/entities/obra.entity';
import { Rol } from '../usuarios/rol.enum';
import { DiasHabilesService } from './dias-habiles.service';
import { EstadoPrestamo, Prestamo } from './entities/prestamo.entity';
import { MorosidadService } from './morosidad.service';
import { PrestamosService } from './prestamos.service';
import { ReglasPrestamoService } from './reglas-prestamo.service';

describe('PrestamosService · devolución (HU-005)', () => {
  // Miércoles 11/nov/2026, 10:00 en Lima.
  const ahora = new Date('2026-11-11T15:00:00Z');
  const usuario = {
    id: 'u-1',
    nombreUsuario: 'biblio',
    rol: Rol.BIBLIOTECARIO,
  };
  const ejemplar = {
    id: 'e-1',
    obraId: 'o-1',
    codigo: 'CEDIS-2026-000001',
  } as Ejemplar;

  let manager: {
    findOne: jest.Mock;
    findOneByOrFail: jest.Mock;
    update: jest.Mock;
  };
  let findOneActivo: jest.Mock;
  let servicio: PrestamosService;

  const prestamo = (
    estado: EstadoPrestamo,
    fechaDevolucion = '2026-11-11',
  ) => ({
    id: 'p-1',
    ejemplarId: 'e-1',
    estado,
    fechaDevolucion,
  });

  beforeEach(() => {
    manager = {
      findOne: jest.fn(),
      findOneByOrFail: jest.fn((entidad: unknown) =>
        Promise.resolve(
          entidad === Obra
            ? { id: 'o-1', titulo: 'Cálculo diferencial' }
            : ejemplar,
        ),
      ),
      update: jest.fn(),
    };
    findOneActivo = jest.fn();
    const dataSource = {
      transaction: jest.fn((fn: (m: EntityManager) => Promise<unknown>) =>
        fn(manager as unknown as EntityManager),
      ),
      getRepository: jest.fn(() => ({ findOne: findOneActivo })),
    };
    servicio = new PrestamosService(
      dataSource as unknown as DataSource,
      {} as ReglasPrestamoService,
      {} as MorosidadService,
      new DiasHabilesService(),
    );
  });

  it('HU-005 #1: devolución de un préstamo vigente → Devuelto y ejemplar disponible', async () => {
    manager.findOne.mockResolvedValue(prestamo(EstadoPrestamo.VIGENTE));

    const res = await servicio.registrarDevolucion('p-1', usuario, ahora);

    expect(res).toMatchObject({
      estado: EstadoPrestamo.DEVUELTO,
      fechaDevuelto: '2026-11-11',
      conAtraso: false,
      ejemplar: { codigo: 'CEDIS-2026-000001', titulo: 'Cálculo diferencial' },
    });
    expect(manager.update).toHaveBeenCalledWith(Prestamo, 'p-1', {
      estado: EstadoPrestamo.DEVUELTO,
      fechaDevuelto: '2026-11-11',
      actualizadoPor: 'u-1',
    });
    expect(manager.update).toHaveBeenCalledWith(Ejemplar, 'e-1', {
      estado: EstadoEjemplar.DISPONIBLE,
      actualizadoPor: 'u-1',
    });
  });

  it('HU-005 #3: devolución de un préstamo vencido → Devuelto, queda constancia del atraso', async () => {
    manager.findOne.mockResolvedValue(
      prestamo(EstadoPrestamo.VENCIDO, '2026-11-06'),
    );

    const res = await servicio.registrarDevolucion('p-1', usuario, ahora);

    expect(res.estado).toBe(EstadoPrestamo.DEVUELTO);
    expect(res.conAtraso).toBe(true);
  });

  it('HU-005 #4/#5: un préstamo ya devuelto → 409 y no se modifica nada', async () => {
    manager.findOne.mockResolvedValue(prestamo(EstadoPrestamo.DEVUELTO));

    await expect(
      servicio.registrarDevolucion('p-1', usuario, ahora),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(manager.update).not.toHaveBeenCalled();
  });

  it('HU-005 #6: préstamo inexistente → 404', async () => {
    manager.findOne.mockResolvedValue(null);

    await expect(
      servicio.registrarDevolucion('p-9', usuario, ahora),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('HU-005 #6: ejemplar sin préstamo activo → 404', async () => {
    findOneActivo.mockResolvedValue(null);

    await expect(
      servicio.buscarActivoPorEjemplar('cedis-2026-000009'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('HU-005: la búsqueda enmascara el DNI del lector', async () => {
    findOneActivo.mockResolvedValue({
      id: 'p-1',
      estado: EstadoPrestamo.VENCIDO,
      fechaPrestamo: '2026-11-02',
      fechaDevolucion: '2026-11-05',
      ejemplar: { codigo: 'CEDIS-2026-000001', obra: { titulo: 'Cálculo' } },
      lector: { nombres: 'Ana', apellidos: 'Quispe', dni: '45678912' },
    });

    const res = await servicio.buscarActivoPorEjemplar(' cedis-2026-000001 ');

    expect(res.lector.dni).toBe('****8912');
    expect(res.estado).toBe(EstadoPrestamo.VENCIDO);
  });
});
