import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, QueryFailedError } from 'typeorm';
import { Ejemplar, EstadoEjemplar } from '../catalogo/entities/ejemplar.entity';
import { Obra } from '../catalogo/entities/obra.entity';
import { Lector } from '../lectores/entities/lector.entity';
import { Rol } from '../usuarios/rol.enum';
import { DiasHabilesService } from './dias-habiles.service';
import { EstadoPrestamo } from './entities/prestamo.entity';
import {
  EstadoMorosidad,
  MENSAJE_BLOQUEO,
  MorosidadService,
} from './morosidad.service';
import {
  MENSAJE_EJEMPLAR_NO_DISPONIBLE,
  MENSAJE_LECTOR_NO_REGISTRADO,
  PrestamosService,
} from './prestamos.service';
import {
  MENSAJE_PRESTAMO_ACTIVO,
  ReglasPrestamoService,
} from './reglas-prestamo.service';

describe('PrestamosService · registrar (HU-004)', () => {
  // Viernes 6/nov/2026, 10:00 en Lima.
  const ahora = new Date('2026-11-06T15:00:00Z');
  const usuario = {
    id: 'u-1',
    nombreUsuario: 'biblio',
    rol: Rol.BIBLIOTECARIO,
  };
  const dto = { lectorId: 'l-1', codigoEjemplar: 'CEDIS-2026-000001' };

  const ejemplar = {
    id: 'e-1',
    obraId: 'o-1',
    codigo: 'CEDIS-2026-000001',
    estado: EstadoEjemplar.DISPONIBLE,
  } as Ejemplar;
  const lector = {
    id: 'l-1',
    dni: '45678912',
    nombres: 'Ana',
    apellidos: 'Quispe',
  } as Lector;

  let manager: {
    findOne: jest.Mock;
    findOneBy: jest.Mock;
    findOneByOrFail: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };
  let validarSinPrestamoActivo: jest.Mock;
  let evaluar: jest.Mock;
  let traducirErrorDeInsercion: jest.Mock;
  let servicio: PrestamosService;
  const orden: string[] = [];

  beforeEach(() => {
    orden.length = 0;
    manager = {
      findOne: jest.fn().mockResolvedValue({ ...ejemplar }),
      findOneBy: jest.fn().mockResolvedValue(lector),
      findOneByOrFail: jest
        .fn()
        .mockResolvedValue({ id: 'o-1', titulo: 'Cálculo diferencial' }),
      create: jest.fn((_e: unknown, datos: object) => datos),
      save: jest.fn((datos: object) =>
        Promise.resolve({ ...datos, id: 'p-1', creadoEn: ahora }),
      ),
      update: jest.fn(),
    };
    validarSinPrestamoActivo = jest.fn(() => {
      orden.push('RN-08');
      return Promise.resolve();
    });
    evaluar = jest.fn(() => {
      orden.push('RN-02');
      return Promise.resolve({
        estado: EstadoMorosidad.LIBRE,
        devolucionesTardias: 0,
        mensaje: null,
      });
    });
    traducirErrorDeInsercion = jest.fn((e: unknown) => {
      throw e;
    });
    const dataSource = {
      transaction: jest.fn((fn: (m: EntityManager) => Promise<unknown>) =>
        fn(manager as unknown as EntityManager),
      ),
    };
    servicio = new PrestamosService(
      dataSource as unknown as DataSource,
      {
        validarSinPrestamoActivo,
        traducirErrorDeInsercion,
      } as unknown as ReglasPrestamoService,
      { evaluar } as unknown as MorosidadService,
      new DiasHabilesService(),
    );
  });

  it('HU-004 #1: registra el préstamo Vigente con fecha de devolución a 3 días hábiles', async () => {
    const resultado = await servicio.registrar(dto, usuario, ahora);

    expect(manager.save).toHaveBeenCalledWith(
      expect.objectContaining({
        lectorId: 'l-1',
        ejemplarId: 'e-1',
        estado: EstadoPrestamo.VIGENTE,
        fechaPrestamo: '2026-11-06',
        fechaDevolucion: '2026-11-11', // viernes → miércoles
        justificacion: null,
      }),
    );
    expect(resultado).toMatchObject({
      id: 'p-1',
      estado: 'VIGENTE',
      fechaPrestamo: '2026-11-06',
      fechaDevolucion: '2026-11-11',
      ejemplar: { codigo: 'CEDIS-2026-000001', titulo: 'Cálculo diferencial' },
      lector: { nombres: 'Ana', apellidos: 'Quispe', dni: '****8912' },
    });
  });

  it('HU-004 #1: el ejemplar queda prestado y se guarda el usuario responsable', async () => {
    await servicio.registrar(dto, usuario, ahora);

    expect(manager.update).toHaveBeenCalledWith(Ejemplar, 'e-1', {
      estado: EstadoEjemplar.PRESTADO,
      actualizadoPor: 'u-1',
    });
    expect(manager.save).toHaveBeenCalledWith(
      expect.objectContaining({ creadoPor: 'u-1', actualizadoPor: 'u-1' }),
    );
  });

  it('la respuesta nunca incluye el DNI completo', async () => {
    const resultado = await servicio.registrar(dto, usuario, ahora);

    expect(JSON.stringify(resultado)).not.toContain('45678912');
  });

  it('bloquea el ejemplar mientras se registra, buscándolo por código en mayúsculas y activo', async () => {
    await servicio.registrar(
      { ...dto, codigoEjemplar: 'cedis-2026-000001' },
      usuario,
      ahora,
    );

    expect(manager.findOne).toHaveBeenCalledWith(Ejemplar, {
      where: { codigo: 'CEDIS-2026-000001', activo: true },
      lock: { mode: 'pessimistic_write' },
    });
  });

  it('un ejemplar inexistente responde 404', async () => {
    manager.findOne.mockResolvedValue(null);

    await expect(servicio.registrar(dto, usuario, ahora)).rejects.toEqual(
      new NotFoundException('Ejemplar no encontrado'),
    );
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('HU-004 #2 (A1): un ejemplar prestado responde 409 y no registra nada', async () => {
    manager.findOne.mockResolvedValue({
      ...ejemplar,
      estado: EstadoEjemplar.PRESTADO,
    });

    await expect(servicio.registrar(dto, usuario, ahora)).rejects.toEqual(
      new ConflictException(MENSAJE_EJEMPLAR_NO_DISPONIBLE),
    );
    expect(manager.save).not.toHaveBeenCalled();
    expect(manager.update).not.toHaveBeenCalled();
  });

  it('HU-004 #3 (A2): un lector no registrado indica que debe registrarlo primero', async () => {
    manager.findOneBy.mockResolvedValue(null);

    await expect(servicio.registrar(dto, usuario, ahora)).rejects.toEqual(
      new NotFoundException(MENSAJE_LECTOR_NO_REGISTRADO),
    );
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('HU-004 #4: un lector con préstamo activo se rechaza (RN-08) antes de evaluar la morosidad', async () => {
    validarSinPrestamoActivo.mockRejectedValue(
      new ConflictException(MENSAJE_PRESTAMO_ACTIVO),
    );

    await expect(
      servicio.registrar(dto, usuario, ahora),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(evaluar).not.toHaveBeenCalled();
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('P-22: RN-08 se evalúa primero y RN-02 después', async () => {
    await servicio.registrar(dto, usuario, ahora);

    expect(orden).toEqual(['RN-08', 'RN-02']);
  });

  it('las reglas se evalúan dentro de la transacción', async () => {
    await servicio.registrar(dto, usuario, ahora);

    expect(validarSinPrestamoActivo).toHaveBeenCalledWith('l-1', manager);
    expect(evaluar).toHaveBeenCalledWith('l-1', manager);
  });

  describe('RN-02', () => {
    const advertencia = {
      estado: EstadoMorosidad.ADVERTENCIA,
      devolucionesTardias: 1,
      mensaje: 'advertencia',
    };

    it('HU-004 #5: con advertencia y sin justificación responde 400 en el campo justificacion', async () => {
      evaluar.mockResolvedValue(advertencia);

      const error: unknown = await servicio
        .registrar(dto, usuario, ahora)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(BadRequestException);
      const { errors } = (error as BadRequestException).getResponse() as {
        errors: Record<string, string[]>;
      };
      expect(Object.keys(errors)).toEqual(['justificacion']);
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('HU-004 #5: con advertencia y justificación registra el préstamo guardándola', async () => {
      evaluar.mockResolvedValue(advertencia);

      const resultado = await servicio.registrar(
        { ...dto, justificacion: 'Autorizado por la dirección' },
        usuario,
        ahora,
      );

      expect(manager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          justificacion: 'Autorizado por la dirección',
        }),
      );
      expect(resultado.justificacion).toBe('Autorizado por la dirección');
    });

    it('HU-004 #6: un lector bloqueado responde 409 aunque envíe justificación', async () => {
      evaluar.mockResolvedValue({
        estado: EstadoMorosidad.BLOQUEADO,
        devolucionesTardias: 2,
        mensaje: MENSAJE_BLOQUEO,
      });

      await expect(
        servicio.registrar({ ...dto, justificacion: 'x' }, usuario, ahora),
      ).rejects.toEqual(new ConflictException(MENSAJE_BLOQUEO));
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('sin morosidad no se guarda la justificación aunque se envíe', async () => {
      await servicio.registrar(
        { ...dto, justificacion: 'sobra' },
        usuario,
        ahora,
      );

      expect(manager.save).toHaveBeenCalledWith(
        expect.objectContaining({ justificacion: null }),
      );
    });
  });

  describe('registros simultáneos', () => {
    it('HU-004 #4: una violación del índice de RN-08 se traduce a 409', async () => {
      const conflicto = new ConflictException(MENSAJE_PRESTAMO_ACTIVO);
      manager.save.mockRejectedValue(
        new QueryFailedError('INSERT', [], new Error('duplicado')),
      );
      traducirErrorDeInsercion.mockImplementation(() => {
        throw conflicto;
      });

      await expect(servicio.registrar(dto, usuario, ahora)).rejects.toBe(
        conflicto,
      );
      expect(traducirErrorDeInsercion).toHaveBeenCalledWith(
        expect.any(QueryFailedError),
      );
    });
  });

  it('usa la fecha de hoy en Lima: a las 22:00 del jueves en Lima sigue siendo jueves', async () => {
    // 03:00 UTC del viernes = 22:00 del jueves 5/nov en Lima.
    await servicio.registrar(dto, usuario, new Date('2026-11-06T03:00:00Z'));

    expect(manager.save).toHaveBeenCalledWith(
      expect.objectContaining({
        fechaPrestamo: '2026-11-05',
        fechaDevolucion: '2026-11-10', // jueves → martes
      }),
    );
  });

  it('usa el título de la obra del ejemplar', async () => {
    await servicio.registrar(dto, usuario, ahora);

    expect(manager.findOneByOrFail).toHaveBeenCalledWith(Obra, { id: 'o-1' });
  });
});
