import { NotFoundException } from '@nestjs/common';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { Repository } from 'typeorm';
import { Rol } from '../usuarios/rol.enum';
import { EjemplaresController } from './ejemplares.controller';
import { EjemplaresService } from './ejemplares.service';
import { Ejemplar, EstadoEjemplar } from './entities/ejemplar.entity';
import { Obra } from './entities/obra.entity';

describe('EjemplaresService', () => {
  const ejemplar = {
    id: 'e-1',
    codigo: 'CEDIS-2026-000001',
    estado: EstadoEjemplar.DISPONIBLE,
    obra: { id: 'o-1', titulo: 'Cálculo diferencial' } as Obra,
  } as Ejemplar;

  let findOne: jest.Mock;
  let servicio: EjemplaresService;

  beforeEach(() => {
    findOne = jest.fn().mockResolvedValue(ejemplar);
    servicio = new EjemplaresService({
      findOne,
    } as unknown as Repository<Ejemplar>);
  });

  it('devuelve el ejemplar con su obra y marca que está disponible', async () => {
    await expect(servicio.consultar('CEDIS-2026-000001')).resolves.toEqual({
      id: 'e-1',
      codigo: 'CEDIS-2026-000001',
      estado: 'DISPONIBLE',
      disponible: true,
      obra: { id: 'o-1', titulo: 'Cálculo diferencial' },
    });
  });

  it('HU-004 #2: un ejemplar prestado no está disponible', async () => {
    findOne.mockResolvedValue({ ...ejemplar, estado: EstadoEjemplar.PRESTADO });

    await expect(
      servicio.consultar('CEDIS-2026-000001'),
    ).resolves.toMatchObject({ estado: 'PRESTADO', disponible: false });
  });

  it('busca solo ejemplares activos, ignorando mayúsculas y espacios', async () => {
    await servicio.consultar('  cedis-2026-000001 ');

    expect(findOne).toHaveBeenCalledWith({
      where: { codigo: 'CEDIS-2026-000001', activo: true },
      relations: { obra: true },
    });
  });

  it('un código inexistente responde 404', async () => {
    findOne.mockResolvedValue(null);

    await expect(servicio.consultar('NO-EXISTE')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('un ejemplar sin obra cargada se trata como inexistente', async () => {
    findOne.mockResolvedValue({ ...ejemplar, obra: undefined });

    await expect(
      servicio.consultar('CEDIS-2026-000001'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  describe('controlador', () => {
    it('delega en el servicio', async () => {
      const consultar = jest.fn().mockResolvedValue('ejemplar');
      const controller = new EjemplaresController({
        consultar,
      } as unknown as EjemplaresService);

      await expect(controller.consultar('CEDIS-2026-000001')).resolves.toBe(
        'ejemplar',
      );
      expect(consultar).toHaveBeenCalledWith('CEDIS-2026-000001');
    });

    it('lo pueden usar el Bibliotecario y el Administrador', () => {
      const roles = Reflect.getMetadata(
        ROLES_KEY,
        EjemplaresController,
      ) as Rol[];

      expect(roles.sort()).toEqual([Rol.ADMINISTRADOR, Rol.BIBLIOTECARIO]);
    });
  });
});
