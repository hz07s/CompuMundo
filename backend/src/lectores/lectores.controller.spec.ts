import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { Rol } from '../usuarios/rol.enum';
import { CategoriaLector } from './entities/lector.entity';
import { LectoresController } from './lectores.controller';
import { LectoresService } from './lectores.service';

describe('LectoresController', () => {
  const lectores = { crear: jest.fn().mockResolvedValue('creado') };
  const controller = new LectoresController(
    lectores as unknown as LectoresService,
  );

  it('delega el alta en LectoresService con el usuario autenticado', async () => {
    const dto = {
      dni: '12345678',
      nombres: 'Ana',
      apellidos: 'Quispe',
      categoria: CategoriaLector.DOCENTE,
      fechaNacimiento: '1990-01-01',
    };
    const usuario = { id: 'u-1', nombreUsuario: 'b', rol: Rol.BIBLIOTECARIO };

    await expect(controller.crear(dto, usuario)).resolves.toBe('creado');
    expect(lectores.crear).toHaveBeenCalledWith(dto, usuario);
  });

  it('el alta es exclusiva del Bibliotecario', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, LectoresController) as Rol[];

    expect(roles).toEqual([Rol.BIBLIOTECARIO]);
  });
});
