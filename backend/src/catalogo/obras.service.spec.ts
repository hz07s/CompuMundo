import { NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Ejemplar, EstadoEjemplar } from './entities/ejemplar.entity';
import { Obra } from './entities/obra.entity';
import { ObrasService } from './obras.service';

describe('ObrasService', () => {
  const obra = {
    id: 'o-1',
    titulo: 'Cálculo',
    categoria: 'Matemáticas',
    autores: ['Stewart'],
    fechaPublicacion: '2012-01-15',
    activo: true,
    creadoEn: new Date('2026-10-01'),
  } as Obra;

  let manager: {
    create: jest.Mock;
    save: jest.Mock;
    insert: jest.Mock;
    existsBy: jest.Mock;
  };
  let obras: { findOneBy: jest.Mock; findAndCount: jest.Mock };
  let ejemplares: { find: jest.Mock; createQueryBuilder: jest.Mock };
  let conteos: Array<{ obraId: string; total: string; disponibles: string }>;
  let codigos: { reservar: jest.Mock };
  let service: ObrasService;

  beforeEach(() => {
    manager = {
      create: jest.fn((_entidad: unknown, datos: object) => datos),
      save: jest.fn((datos: object) =>
        Promise.resolve({ ...datos, id: 'o-1' }),
      ),
      insert: jest.fn(),
      existsBy: jest.fn().mockResolvedValue(true),
    };
    const dataSource = {
      transaction: jest.fn((fn: (m: EntityManager) => Promise<unknown>) =>
        fn(manager as unknown as EntityManager),
      ),
    };
    conteos = [{ obraId: 'o-1', total: '3', disponibles: '2' }];
    const qb = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      setParameter: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(() => Promise.resolve(conteos)),
    };
    obras = {
      findOneBy: jest.fn().mockResolvedValue(obra),
      findAndCount: jest.fn().mockResolvedValue([[obra], 1]),
    };
    ejemplares = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'e-1',
          codigo: 'CEDIS-2026-000001',
          estado: EstadoEjemplar.DISPONIBLE,
        },
      ]),
      createQueryBuilder: jest.fn(() => qb),
    };
    codigos = {
      reservar: jest
        .fn()
        .mockResolvedValue(['CEDIS-2026-000001', 'CEDIS-2026-000002']),
    };
    service = new ObrasService(
      dataSource as unknown as DataSource,
      obras as unknown as Repository<Obra>,
      ejemplares as unknown as Repository<Ejemplar>,
      codigos,
    );
  });

  it('crea la obra y un ejemplar por código reservado en la misma transacción', async () => {
    await service.crear({
      titulo: 'Cálculo',
      categoria: 'Matemáticas',
      autores: ['Stewart'],
      fechaPublicacion: '2012-01-15',
      cantidad: 2,
    });

    expect(codigos.reservar).toHaveBeenCalledWith(manager, 2);
    expect(manager.insert).toHaveBeenCalledWith(Ejemplar, [
      { obraId: 'o-1', codigo: 'CEDIS-2026-000001' },
      { obraId: 'o-1', codigo: 'CEDIS-2026-000002' },
    ]);
  });

  it('el detalle incluye ejemplares, total y disponibilidad calculada', async () => {
    const detalle = await service.detalle('o-1');

    expect(detalle).toMatchObject({
      id: 'o-1',
      totalEjemplares: 3,
      disponibilidad: 2,
      ejemplares: [
        { id: 'e-1', codigo: 'CEDIS-2026-000001', estado: 'DISPONIBLE' },
      ],
    });
  });

  it('una obra sin ejemplares activos tiene disponibilidad 0', async () => {
    conteos = [];

    await expect(service.detalle('o-1')).resolves.toMatchObject({
      totalEjemplares: 0,
      disponibilidad: 0,
    });
  });

  it('el detalle de una obra inexistente responde 404', async () => {
    obras.findOneBy.mockResolvedValue(null);

    await expect(service.detalle('x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('agregar ejemplares a una obra inexistente responde 404 y no reserva códigos', async () => {
    manager.existsBy.mockResolvedValue(false);

    await expect(service.agregarEjemplares('x', 2)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(codigos.reservar).not.toHaveBeenCalled();
  });

  it('agrega ejemplares a una obra existente', async () => {
    await service.agregarEjemplares('o-1', 2);

    expect(codigos.reservar).toHaveBeenCalledWith(manager, 2);
  });

  it('lista paginado con conteos por obra', async () => {
    const query = Object.assign(new PaginationQueryDto(), {
      page: 2,
      limit: 10,
    });

    const resultado = await service.listar(query);

    expect(obras.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 }),
    );
    expect(resultado).toMatchObject({
      total: 1,
      page: 2,
      limit: 10,
      data: [{ id: 'o-1', disponibilidad: 2 }],
    });
  });

  it('una página vacía no consulta conteos', async () => {
    obras.findAndCount.mockResolvedValue([[], 0]);

    await expect(
      service.listar(new PaginationQueryDto()),
    ).resolves.toMatchObject({
      data: [],
      total: 0,
    });
    expect(ejemplares.createQueryBuilder).not.toHaveBeenCalled();
  });
});
