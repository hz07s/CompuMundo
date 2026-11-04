import { Repository } from 'typeorm';
import { Usuario } from './entities/usuario.entity';
import { Rol } from './rol.enum';
import { seedAdministrador } from './seed-administrador';

describe('seedAdministrador', () => {
  const hash = jest.fn((password: string) =>
    Promise.resolve(`hash:${password}`),
  );
  let repo: { findOneBy: jest.Mock; insert: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    repo = { findOneBy: jest.fn(), insert: jest.fn() };
  });

  const ejecutar = (credenciales: {
    nombreUsuario?: string;
    password?: string;
  }) =>
    seedAdministrador(
      repo as unknown as Repository<Usuario>,
      credenciales,
      hash,
    );

  it('crea el Administrador con la contraseña hasheada', async () => {
    repo.findOneBy.mockResolvedValue(null);

    await expect(
      ejecutar({ nombreUsuario: 'admin', password: 'clave-segura' }),
    ).resolves.toBe('creado');
    expect(repo.insert).toHaveBeenCalledWith({
      nombreUsuario: 'admin',
      passwordHash: 'hash:clave-segura',
      rol: Rol.ADMINISTRADOR,
    });
  });

  it('es idempotente: no duplica un Administrador existente', async () => {
    repo.findOneBy.mockResolvedValue({ id: '1', nombreUsuario: 'admin' });

    await expect(
      ejecutar({ nombreUsuario: 'admin', password: 'clave-segura' }),
    ).resolves.toBe('existente');
    expect(repo.insert).not.toHaveBeenCalled();
  });

  it('se omite si faltan las credenciales', async () => {
    await expect(ejecutar({ nombreUsuario: 'admin' })).resolves.toBe('omitido');
    expect(repo.findOneBy).not.toHaveBeenCalled();
  });
});
