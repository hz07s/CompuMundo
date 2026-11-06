import { ConflictException } from '@nestjs/common';
import { EntityManager, QueryFailedError, Repository } from 'typeorm';
import {
  EstadoPrestamo,
  INDICE_PRESTAMO_ACTIVO_POR_LECTOR,
  Prestamo,
} from './entities/prestamo.entity';
import {
  MENSAJE_PRESTAMO_ACTIVO,
  ReglasPrestamoService,
} from './reglas-prestamo.service';

describe('ReglasPrestamoService · RN-08', () => {
  let exists: jest.Mock;
  let servicio: ReglasPrestamoService;

  beforeEach(() => {
    exists = jest.fn().mockResolvedValue(false);
    servicio = new ReglasPrestamoService({
      exists,
    } as unknown as Repository<Prestamo>);
  });

  it('HU-004 #4: un lector sin préstamos activos puede recibir uno nuevo', async () => {
    await expect(
      servicio.validarSinPrestamoActivo('l-1'),
    ).resolves.toBeUndefined();
  });

  it('HU-004 #4: un lector con un préstamo activo recibe 409', async () => {
    exists.mockResolvedValue(true);

    await expect(servicio.validarSinPrestamoActivo('l-1')).rejects.toEqual(
      new ConflictException(MENSAJE_PRESTAMO_ACTIVO),
    );
  });

  it('considera activos solo los estados Vigente y Vencido del lector indicado', async () => {
    await servicio.validarSinPrestamoActivo('l-1');

    expect(exists).toHaveBeenCalledWith({
      where: [
        { lectorId: 'l-1', estado: EstadoPrestamo.VIGENTE },
        { lectorId: 'l-1', estado: EstadoPrestamo.VENCIDO },
      ],
    });
  });

  it('dentro de una transacción usa el repositorio del manager recibido', async () => {
    const existsTx = jest.fn().mockResolvedValue(true);
    const manager = {
      getRepository: jest.fn().mockReturnValue({ exists: existsTx }),
    } as unknown as EntityManager;

    await expect(
      servicio.validarSinPrestamoActivo('l-1', manager),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(exists).not.toHaveBeenCalled();
  });

  describe('traducirErrorDeInsercion', () => {
    const errorDe = (code: string, constraint?: string) =>
      new QueryFailedError('INSERT', [], {
        code,
        constraint,
      } as unknown as Error);

    it('HU-004 #4: dos registros simultáneos (índice único de RN-08) responden 409', () => {
      expect(() =>
        servicio.traducirErrorDeInsercion(
          errorDe('23505', INDICE_PRESTAMO_ACTIVO_POR_LECTOR),
        ),
      ).toThrow(new ConflictException(MENSAJE_PRESTAMO_ACTIVO));
    });

    it('una violación única de otra restricción no se disfraza de RN-08', () => {
      const otro = errorDe('23505', 'UQ_otra');

      expect(() => servicio.traducirErrorDeInsercion(otro)).toThrow(otro);
    });

    it.each([new Error('caída'), errorDe('08006')])(
      'relanza cualquier otro error tal cual (%#)',
      (error) => {
        expect(() => servicio.traducirErrorDeInsercion(error)).toThrow(error);
      },
    );
  });
});
