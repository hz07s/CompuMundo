import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { UsuariosController } from './usuarios.controller';
import { Rol } from './rol.enum';
import { UsuariosService } from './usuarios.service';

describe('UsuariosController', () => {
  const lista = [
    {
      id: '1',
      nombreUsuario: 'admin',
      rol: Rol.ADMINISTRADOR,
      activo: true,
      creadoEn: new Date('2026-10-01'),
    },
  ];
  const usuarios = { listar: jest.fn().mockResolvedValue(lista) };
  const controller = new UsuariosController(
    usuarios as unknown as UsuariosService,
  );

  it('delega el listado en UsuariosService', async () => {
    await expect(controller.listar()).resolves.toBe(lista);
    expect(usuarios.listar).toHaveBeenCalledTimes(1);
  });

  it('el listado es exclusivo del Administrador', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, UsuariosController) as Rol[];

    expect(roles).toEqual([Rol.ADMINISTRADOR]);
  });
});
