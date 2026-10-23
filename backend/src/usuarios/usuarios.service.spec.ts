import { Repository } from 'typeorm';
import { Usuario } from './entities/usuario.entity';
import { Rol } from './rol.enum';
import { UsuariosService } from './usuarios.service';

describe('UsuariosService', () => {
  it('lista el personal sin incluir el hash de contraseña', async () => {
    const creadoEn = new Date();
    const repo = {
      find: jest.fn().mockResolvedValue([
        {
          id: '1',
          nombreUsuario: 'admin',
          rol: Rol.ADMINISTRADOR,
          activo: true,
          creadoEn,
          actualizadoEn: creadoEn,
          passwordHash: '$2b$10$secreto',
        },
      ]),
    };
    const service = new UsuariosService(repo as unknown as Repository<Usuario>);

    const lista = await service.listar();

    expect(lista).toEqual([
      {
        id: '1',
        nombreUsuario: 'admin',
        rol: Rol.ADMINISTRADOR,
        activo: true,
        creadoEn,
      },
    ]);
    expect(lista[0]).not.toHaveProperty('passwordHash');
  });
});
