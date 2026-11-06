import { ConflictException, NotFoundException } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { Rol } from '../usuarios/rol.enum';
import { Lector } from '../lectores/entities/lector.entity';
import { DesbloqueoLector } from './entities/desbloqueo-lector.entity';
import { Prestamo } from './entities/prestamo.entity';
import {
  EstadoMorosidad,
  MENSAJE_ADVERTENCIA,
  MENSAJE_BLOQUEO,
  MorosidadService,
} from './morosidad.service';

/** Devolución más reciente primero; `tarde` = devuelto después de la fecha pactada. */
const devuelto = (tarde: boolean): Prestamo =>
  ({
    fechaDevolucion: '2026-11-12',
    fechaDevuelto: tarde ? '2026-11-16' : '2026-11-11',
  }) as Prestamo;

describe('MorosidadService · RN-02', () => {
  const admin = { id: 'a-1', nombreUsuario: 'admin', rol: Rol.ADMINISTRADOR };

  let prestamos: { find: jest.Mock };
  let desbloqueos: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let lectores: { existsBy: jest.Mock };
  let servicio: MorosidadService;

  beforeEach(() => {
    prestamos = { find: jest.fn().mockResolvedValue([]) };
    desbloqueos = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((datos: object) => datos),
      save: jest.fn((datos: object) =>
        Promise.resolve({ ...datos, id: 'd-1', creadoEn: new Date() }),
      ),
    };
    lectores = { existsBy: jest.fn().mockResolvedValue(true) };
    servicio = new MorosidadService(
      prestamos as unknown as Repository<Prestamo>,
      desbloqueos as unknown as Repository<DesbloqueoLector>,
      lectores as unknown as Repository<Lector>,
    );
  });

  describe('evaluar', () => {
    it('un lector sin devoluciones está libre', async () => {
      await expect(servicio.evaluar('l-1')).resolves.toEqual({
        estado: EstadoMorosidad.LIBRE,
        devolucionesTardias: 0,
        mensaje: null,
      });
    });

    it('si su última devolución fue a tiempo está libre, aunque la anterior fuera tardía', async () => {
      prestamos.find.mockResolvedValue([devuelto(false), devuelto(true)]);

      await expect(servicio.evaluar('l-1')).resolves.toMatchObject({
        estado: EstadoMorosidad.LIBRE,
      });
    });

    it('HU-004 #5: la primera devolución tardía da una advertencia', async () => {
      prestamos.find.mockResolvedValue([devuelto(true)]);

      await expect(servicio.evaluar('l-1')).resolves.toEqual({
        estado: EstadoMorosidad.ADVERTENCIA,
        devolucionesTardias: 1,
        mensaje: MENSAJE_ADVERTENCIA,
      });
    });

    it('una tardía seguida (hacia atrás) de una a tiempo sigue siendo la primera vez', async () => {
      prestamos.find.mockResolvedValue([devuelto(true), devuelto(false)]);

      await expect(servicio.evaluar('l-1')).resolves.toMatchObject({
        estado: EstadoMorosidad.ADVERTENCIA,
        devolucionesTardias: 1,
      });
    });

    it('HU-004 #6: dos devoluciones tardías consecutivas sin regularizar bloquean', async () => {
      prestamos.find.mockResolvedValue([devuelto(true), devuelto(true)]);

      await expect(servicio.evaluar('l-1')).resolves.toEqual({
        estado: EstadoMorosidad.BLOQUEADO,
        devolucionesTardias: 2,
        mensaje: MENSAJE_BLOQUEO,
      });
    });

    it('devolver el mismo día del vencimiento no es tardanza', async () => {
      prestamos.find.mockResolvedValue([
        { fechaDevolucion: '2026-11-12', fechaDevuelto: '2026-11-12' },
      ]);

      await expect(servicio.evaluar('l-1')).resolves.toMatchObject({
        estado: EstadoMorosidad.LIBRE,
      });
    });

    it('un préstamo devuelto sin fecha no cuenta como tardío', async () => {
      prestamos.find.mockResolvedValue([
        { fechaDevolucion: '2026-11-12', fechaDevuelto: null },
      ]);

      await expect(servicio.evaluar('l-1')).resolves.toMatchObject({
        estado: EstadoMorosidad.LIBRE,
      });
    });

    it('consulta solo las dos devoluciones más recientes del lector, ya devueltas', async () => {
      await servicio.evaluar('l-1');

      expect(prestamos.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { lectorId: 'l-1', estado: 'DEVUELTO' },
          order: { fechaDevuelto: 'DESC', actualizadoEn: 'DESC' },
          take: 2,
        }),
      );
    });

    it('tras un desbloqueo solo cuentan las devoluciones posteriores a él', async () => {
      const desbloqueo = { creadoEn: new Date('2026-11-20T10:00:00Z') };
      desbloqueos.findOne.mockResolvedValue(desbloqueo);

      await servicio.evaluar('l-1');

      const { where } = (prestamos.find.mock.calls as unknown[][])[0][0] as {
        where: { actualizadoEn: { value: Date } };
      };
      expect(where.actualizadoEn).toBeDefined();
      expect(JSON.stringify(where.actualizadoEn)).toContain('2026-11-20');
    });

    it('dentro de una transacción usa los repositorios del manager', async () => {
      const find = jest.fn().mockResolvedValue([devuelto(true)]);
      const findOne = jest.fn().mockResolvedValue(null);
      const manager = {
        getRepository: jest.fn((entidad: unknown) =>
          entidad === Prestamo ? { find } : { findOne },
        ),
      } as unknown as EntityManager;

      await expect(servicio.evaluar('l-1', manager)).resolves.toMatchObject({
        estado: EstadoMorosidad.ADVERTENCIA,
      });
      expect(prestamos.find).not.toHaveBeenCalled();
    });
  });

  describe('desbloquear', () => {
    it('HU-004 #7: el Administrador desbloquea a un lector bloqueado y queda su usuario', async () => {
      prestamos.find.mockResolvedValue([devuelto(true), devuelto(true)]);

      const resultado = await servicio.desbloquear('l-1', 'Regularizó', admin);

      expect(desbloqueos.save).toHaveBeenCalledWith({
        lectorId: 'l-1',
        motivo: 'Regularizó',
        desbloqueadoPor: 'a-1',
      });
      expect(resultado).toMatchObject({ id: 'd-1', desbloqueadoPor: 'a-1' });
    });

    it('un lector inexistente responde 404', async () => {
      lectores.existsBy.mockResolvedValue(false);

      await expect(
        servicio.desbloquear('l-9', 'x', admin),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(desbloqueos.save).not.toHaveBeenCalled();
    });

    it.each([
      ['libre', [] as Prestamo[]],
      ['con advertencia', [devuelto(true)]],
    ])(
      'un lector %s no está bloqueado (409) y no se registra nada',
      async (_e, filas) => {
        prestamos.find.mockResolvedValue(filas);

        await expect(servicio.desbloquear('l-1', 'x', admin)).rejects.toEqual(
          new ConflictException('El lector no está bloqueado'),
        );
        expect(desbloqueos.save).not.toHaveBeenCalled();
      },
    );
  });
});
