import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { Rol } from '../usuarios/rol.enum';
import { DesbloqueosController } from './desbloqueos.controller';
import { MorosidadService } from './morosidad.service';

describe('DesbloqueosController', () => {
  const creadoEn = new Date('2026-11-20T10:00:00Z');
  const desbloquear = jest.fn().mockResolvedValue({
    id: 'd-1',
    lectorId: 'l-1',
    motivo: 'Regularizó',
    desbloqueadoPor: 'a-1',
    creadoEn,
    administrador: { passwordHash: 'no debe salir' },
  });
  const controller = new DesbloqueosController({
    desbloquear,
  } as unknown as MorosidadService);
  const admin = { id: 'a-1', nombreUsuario: 'admin', rol: Rol.ADMINISTRADOR };

  it('delega en MorosidadService y devuelve solo los campos públicos', async () => {
    const resultado = await controller.desbloquear(
      'l-1',
      { motivo: 'Regularizó' },
      admin,
    );

    expect(desbloquear).toHaveBeenCalledWith('l-1', 'Regularizó', admin);
    expect(resultado).toEqual({
      id: 'd-1',
      lectorId: 'l-1',
      motivo: 'Regularizó',
      desbloqueadoPor: 'a-1',
      creadoEn,
    });
  });

  it('HU-004 #8: el desbloqueo es exclusivo del Administrador', () => {
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      DesbloqueosController,
    ) as Rol[];

    expect(roles).toEqual([Rol.ADMINISTRADOR]);
  });
});
