import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { Rol } from '../usuarios/rol.enum';
import { PrestamosController } from './prestamos.controller';
import { PrestamosService } from './prestamos.service';

describe('PrestamosController', () => {
  const registrar = jest.fn().mockResolvedValue('registrado');
  const controller = new PrestamosController({
    registrar,
  } as unknown as PrestamosService);

  it('delega el registro en PrestamosService con el usuario autenticado', async () => {
    const dto = { lectorId: 'l-1', codigoEjemplar: 'CEDIS-2026-000001' };
    const usuario = { id: 'u-1', nombreUsuario: 'b', rol: Rol.BIBLIOTECARIO };

    await expect(controller.registrar(dto, usuario)).resolves.toBe(
      'registrado',
    );
    expect(registrar).toHaveBeenCalledWith(dto, usuario);
  });

  it('registrar préstamos es exclusivo del Bibliotecario', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, PrestamosController) as Rol[];

    expect(roles).toEqual([Rol.BIBLIOTECARIO]);
  });
});
