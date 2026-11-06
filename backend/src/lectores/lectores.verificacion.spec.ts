import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { Rol } from '../usuarios/rol.enum';
import { CategoriaLector, Lector } from './entities/lector.entity';
import { LectoresController } from './lectores.controller';
import { LectoresService } from './lectores.service';
import { FormatoDniValidator } from './validacion/formato-dni.validator';

describe('Verificación presencial del lector (HU-007)', () => {
  const hoy = new Date('2026-11-05T12:00:00Z');
  const lector = {
    id: 'l-1',
    dni: '45678912',
    nombres: 'Ana',
    apellidos: 'Quispe',
    categoria: CategoriaLector.ESTUDIANTE,
    fechaNacimiento: '2012-03-01',
    apoderadoDni: '87654321',
    apoderadoNombre: 'Rosa Mamani',
    activo: true,
  } as Lector;

  let repo: { findOneBy: jest.Mock };
  let service: LectoresService;

  beforeEach(() => {
    repo = { findOneBy: jest.fn().mockResolvedValue(lector) };
    service = new LectoresService(
      repo as unknown as Repository<Lector>,
      new FormatoDniValidator(),
    );
  });

  it('HU-007 #2: devuelve el DNI del lector completo', async () => {
    const resultado = await service.verificar('45678912', hoy);

    expect(resultado.dni).toBe('45678912');
    expect(resultado).toMatchObject({
      id: 'l-1',
      nombres: 'Ana',
      esMenor: true,
      activo: true,
    });
  });

  it('el DNI del apoderado sigue enmascarado incluso en la verificación', async () => {
    const resultado = await service.verificar('45678912', hoy);

    expect(resultado.apoderadoDni).toBe('****4321');
    expect(JSON.stringify(resultado)).not.toContain('87654321');
  });

  it('un lector mayor no tiene apoderado', async () => {
    repo.findOneBy.mockResolvedValue({
      ...lector,
      fechaNacimiento: '1990-01-01',
      apoderadoDni: null,
      apoderadoNombre: null,
    });

    await expect(service.verificar('45678912', hoy)).resolves.toMatchObject({
      esMenor: false,
      apoderadoDni: null,
    });
  });

  it('HU-004 A2: un DNI que no existe indica que debe registrar primero al lector', async () => {
    repo.findOneBy.mockResolvedValue(null);

    await expect(service.verificar('45678912')).rejects.toEqual(
      new NotFoundException(
        'El lector no está registrado. Debe registrarlo primero',
      ),
    );
  });

  it('busca solo entre los lectores activos', async () => {
    await service.verificar('45678912', hoy);

    expect(repo.findOneBy).toHaveBeenCalledWith({
      dni: '45678912',
      activo: true,
    });
  });

  it.each(['1234567', 'abcdefgh', ''])(
    'un DNI con formato inválido (%p) responde 400 sin consultar la base',
    async (dni) => {
      await expect(service.verificar(dni)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(repo.findOneBy).not.toHaveBeenCalled();
    },
  );

  describe('controlador', () => {
    it('lo pueden usar el Bibliotecario y el Administrador', () => {
      const metodo = Object.getOwnPropertyDescriptor(
        LectoresController.prototype,
        'verificar',
      )?.value as object;
      const roles = Reflect.getMetadata(ROLES_KEY, metodo) as Rol[];

      expect(roles.sort()).toEqual([Rol.ADMINISTRADOR, Rol.BIBLIOTECARIO]);
    });

    it('delega en el servicio con el DNI del cuerpo', async () => {
      const verificar = jest.fn().mockResolvedValue('verificado');
      const controller = new LectoresController({
        verificar,
      } as unknown as LectoresService);

      await expect(controller.verificar({ dni: '45678912' })).resolves.toBe(
        'verificado',
      );
      expect(verificar).toHaveBeenCalledWith('45678912');
    });
  });
});
