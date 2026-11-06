import { BadRequestException, ConflictException } from '@nestjs/common';
import { QueryFailedError, Repository } from 'typeorm';
import { Rol } from '../usuarios/rol.enum';
import { CrearLectorDto } from './dto/crear-lector.dto';
import { CategoriaLector, Lector } from './entities/lector.entity';
import { LectoresService } from './lectores.service';
import { IDniValidator } from './validacion/dni-validator.interface';
import { FormatoDniValidator } from './validacion/formato-dni.validator';

describe('LectoresService', () => {
  const hoy = new Date('2026-11-05T12:00:00Z');
  const usuario = {
    id: 'u-1',
    nombreUsuario: 'biblio',
    rol: Rol.BIBLIOTECARIO,
  };
  const mayor: CrearLectorDto = {
    dni: '12345678',
    nombres: 'Ana',
    apellidos: 'Quispe',
    categoria: CategoriaLector.ESTUDIANTE,
    fechaNacimiento: '2000-05-10',
  };
  const menor: CrearLectorDto = {
    ...mayor,
    fechaNacimiento: '2012-03-01',
    apoderadoDni: '87654321',
    apoderadoNombre: 'Rosa Mamani',
    consentimientoApoderado: true,
  };

  let repo: { existsBy: jest.Mock; create: jest.Mock; save: jest.Mock };
  let validator: IDniValidator;
  let service: LectoresService;

  const errorDe = async (dto: CrearLectorDto) => {
    const error: unknown = await service
      .crear(dto, usuario, hoy)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BadRequestException);
    return (
      (error as BadRequestException).getResponse() as {
        errors: Record<string, string[]>;
      }
    ).errors;
  };

  beforeEach(() => {
    repo = {
      existsBy: jest.fn().mockResolvedValue(false),
      create: jest.fn((datos: object) => datos),
      save: jest.fn((datos: object) =>
        Promise.resolve({
          ...datos,
          id: 'l-1',
          activo: true,
          creadoEn: hoy,
        }),
      ),
    };
    validator = new FormatoDniValidator();
    service = new LectoresService(
      repo as unknown as Repository<Lector>,
      validator,
    );
  });

  it('HU-003 #1: registra al lector mayor de edad con el usuario responsable y el DNI enmascarado', async () => {
    const lector = await service.crear(mayor, usuario, hoy);

    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        dni: '12345678',
        creadoPor: 'u-1',
        actualizadoPor: 'u-1',
        apoderadoDni: null,
        consentimientoApoderado: false,
      }),
    );
    expect(lector).toMatchObject({
      id: 'l-1',
      dni: '****5678',
      esMenor: false,
      activo: true,
      apoderadoDni: null,
    });
    expect(JSON.stringify(lector)).not.toContain('12345678');
  });

  it.each(['1234567', '123456789', '1234567a', ''])(
    'HU-003 #2: el DNI %p se rechaza con el error de formato y no se guarda',
    async (dni) => {
      const errores = await errorDe({ ...mayor, dni });

      expect(errores.dni).toEqual([
        'El DNI debe tener exactamente 8 dígitos numéricos',
      ]);
      expect(repo.save).not.toHaveBeenCalled();
    },
  );

  it('HU-003 #3: un DNI repetido responde 409 y no se guarda', async () => {
    repo.existsBy.mockResolvedValue(true);

    await expect(service.crear(mayor, usuario, hoy)).rejects.toEqual(
      new ConflictException('El DNI ya está registrado'),
    );
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('HU-003 #3: si dos altas compiten por el mismo DNI, la restricción UNIQUE responde 409', async () => {
    const unique = new QueryFailedError('INSERT', [], {
      code: '23505',
    } as unknown as Error);
    repo.save.mockRejectedValue(unique);

    await expect(service.crear(mayor, usuario, hoy)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('propaga cualquier otro error de base de datos', async () => {
    const otro = new QueryFailedError('INSERT', [], {
      code: '08006',
    } as unknown as Error);
    repo.save.mockRejectedValue(otro);

    await expect(service.crear(mayor, usuario, hoy)).rejects.toBe(otro);
    repo.save.mockRejectedValue(new Error('caída'));
    await expect(service.crear(mayor, usuario, hoy)).rejects.toThrow('caída');
  });

  it('HU-003 #4: valida el DNI exclusivamente mediante IDniValidator', async () => {
    const validar = jest.fn().mockResolvedValue(false);
    const falso: IDniValidator = { validar };
    service = new LectoresService(repo as unknown as Repository<Lector>, falso);

    const errores = await errorDe(mayor);

    expect(validar).toHaveBeenCalledWith('12345678');
    expect(errores.dni).toBeDefined();
  });

  it('HU-003 #5: registra al menor con apoderado y consentimiento', async () => {
    const lector = await service.crear(menor, usuario, hoy);

    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        apoderadoDni: '87654321',
        apoderadoNombre: 'Rosa Mamani',
        consentimientoApoderado: true,
      }),
    );
    expect(lector).toMatchObject({
      esMenor: true,
      apoderadoDni: '****4321',
      apoderadoNombre: 'Rosa Mamani',
      consentimientoApoderado: true,
    });
  });

  it('HU-003 #5: el DNI del apoderado se valida con las mismas reglas de formato', async () => {
    const errores = await errorDe({ ...menor, apoderadoDni: '123' });

    expect(errores).toEqual({
      apoderadoDni: ['El DNI debe tener exactamente 8 dígitos numéricos'],
    });
  });

  it('HU-003 #6: un menor sin ningún dato del apoderado recibe todos los faltantes', async () => {
    const errores = await errorDe({ ...mayor, fechaNacimiento: '2012-03-01' });

    expect(Object.keys(errores).sort()).toEqual([
      'apoderadoDni',
      'apoderadoNombre',
      'consentimientoApoderado',
    ]);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it.each([
    [{ consentimientoApoderado: false }, 'consentimientoApoderado'],
    [{ consentimientoApoderado: undefined }, 'consentimientoApoderado'],
    [{ apoderadoNombre: undefined }, 'apoderadoNombre'],
    [{ apoderadoDni: undefined }, 'apoderadoDni'],
  ])(
    'HU-003 #6: a un menor le falta %j y solo se señala ese campo',
    async (cambio, campo) => {
      const errores = await errorDe({ ...menor, ...cambio });

      expect(Object.keys(errores)).toEqual([campo]);
    },
  );

  it('quien cumple 18 años hoy se registra como mayor, sin apoderado', async () => {
    const lector = await service.crear(
      { ...mayor, fechaNacimiento: '2008-11-05', apoderadoDni: '87654321' },
      usuario,
      hoy,
    );

    expect(lector.esMenor).toBe(false);
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ apoderadoDni: null }),
    );
  });

  it('rechaza una fecha de nacimiento posterior a hoy', async () => {
    const errores = await errorDe({ ...mayor, fechaNacimiento: '2027-01-01' });

    expect(Object.keys(errores)).toEqual(['fechaNacimiento']);
  });
});
