import { ConflictException, NotFoundException } from '@nestjs/common';
import { QueryFailedError, Repository } from 'typeorm';
import { UsuarioAutenticado } from '../auth/auth.types';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { PasswordService } from '../auth/password.service';
import { Usuario } from './entities/usuario.entity';
import { Rol } from './rol.enum';
import {
  CORREO_DUPLICADO,
  NOMBRE_DUPLICADO,
  SIN_AUTOBLOQUEO,
  UsuariosService,
} from './usuarios.service';

const admin: UsuarioAutenticado = {
  id: 'admin-1',
  nombreUsuario: 'admin',
  rol: Rol.ADMINISTRADOR,
};
const creadoEn = new Date('2026-11-20T15:00:00Z');

function crearServicio(existentes: Partial<Usuario>[] = []) {
  const repo = {
    find: jest.fn().mockResolvedValue(existentes),
    existsBy: jest.fn(({ nombreUsuario, email }: Partial<Usuario>) =>
      Promise.resolve(
        existentes.some(
          (u) =>
            (nombreUsuario && u.nombreUsuario === nombreUsuario) ||
            (email && u.email === email),
        ),
      ),
    ),
    findOneBy: jest.fn(({ id }: { id: string }) =>
      Promise.resolve(existentes.find((u) => u.id === id) ?? null),
    ),
    create: jest.fn((u: Partial<Usuario>) => u),
    save: jest.fn((u: Partial<Usuario>) =>
      Promise.resolve({ id: 'nuevo', creadoEn, ...u }),
    ),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };
  const tokens = { update: jest.fn().mockResolvedValue({ affected: 2 }) };
  const passwords = {
    hash: jest.fn((p: string) => Promise.resolve(`hash(${p})`)),
  };
  const servicio = new UsuariosService(
    repo as unknown as Repository<Usuario>,
    tokens as unknown as Repository<RefreshToken>,
    passwords as unknown as PasswordService,
  );
  return { servicio, repo, tokens, passwords };
}

const biblio: Partial<Usuario> = {
  id: 'biblio-1',
  nombreUsuario: 'mquispe',
  rol: Rol.BIBLIOTECARIO,
  email: 'mquispe@unsa.edu.pe',
  activo: true,
  creadoEn,
};

describe('UsuariosService (HU-021)', () => {
  it('lista el personal sin incluir el hash de contraseña', async () => {
    const { servicio } = crearServicio([
      { ...biblio, passwordHash: '$2b$10$secreto' },
    ]);

    const lista = await servicio.listar();

    expect(lista).toEqual([
      {
        id: 'biblio-1',
        nombreUsuario: 'mquispe',
        rol: Rol.BIBLIOTECARIO,
        email: 'mquispe@unsa.edu.pe',
        activo: true,
        creadoEn,
      },
    ]);
    expect(lista[0]).not.toHaveProperty('passwordHash');
  });

  it('HU-021 #1: crea la cuenta con la contraseña hasheada y el Administrador como autor', async () => {
    const { servicio, repo } = crearServicio();

    const creado = await servicio.crear(
      {
        nombreUsuario: 'jperez',
        password: 'clave-123',
        rol: Rol.BIBLIOTECARIO,
      },
      admin,
    );

    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        passwordHash: 'hash(clave-123)',
        email: null,
        activo: true,
        creadoPor: 'admin-1',
        actualizadoPor: 'admin-1',
      }),
    );
    expect(creado).toMatchObject({ id: 'nuevo', nombreUsuario: 'jperez' });
    expect(creado).not.toHaveProperty('passwordHash');
  });

  it('HU-021 #2: nombre de usuario repetido → 409', async () => {
    const { servicio, repo } = crearServicio([biblio]);

    await expect(
      servicio.crear(
        {
          nombreUsuario: 'mquispe',
          password: 'clave-123',
          rol: Rol.BIBLIOTECARIO,
        },
        admin,
      ),
    ).rejects.toThrow(new ConflictException(NOMBRE_DUPLICADO));
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('HU-021 #2: correo repetido → 409', async () => {
    const { servicio } = crearServicio([biblio]);

    await expect(
      servicio.crear(
        {
          nombreUsuario: 'otro',
          password: 'clave-123',
          rol: Rol.BIBLIOTECARIO,
          email: 'mquispe@unsa.edu.pe',
        },
        admin,
      ),
    ).rejects.toThrow(new ConflictException(CORREO_DUPLICADO));
  });

  it('HU-021 #2: en una carrera la restricción UNIQUE da 409 con el campo correcto', async () => {
    const { servicio, repo } = crearServicio();
    const unico = (detail: string) =>
      new QueryFailedError('INSERT', [], {
        code: '23505',
        detail,
      } as unknown as Error);
    repo.save.mockRejectedValueOnce(unico('Key (email)=(x) already exists.'));
    repo.save.mockRejectedValueOnce(
      unico('Key (nombre_usuario)=(x) already exists.'),
    );
    const dto = {
      nombreUsuario: 'x',
      password: 'clave-123',
      rol: Rol.BIBLIOTECARIO,
    };

    await expect(servicio.crear(dto, admin)).rejects.toThrow(CORREO_DUPLICADO);
    await expect(servicio.crear(dto, admin)).rejects.toThrow(NOMBRE_DUPLICADO);
  });

  it('otro error de BD se propaga tal cual', async () => {
    const { servicio, repo } = crearServicio();
    repo.save.mockRejectedValueOnce(new Error('BD caída'));

    await expect(
      servicio.crear(
        { nombreUsuario: 'x', password: 'clave-123', rol: Rol.BIBLIOTECARIO },
        admin,
      ),
    ).rejects.toThrow('BD caída');
  });

  it('HU-021 #3: deshabilitar la cuenta revoca sus refresh tokens', async () => {
    const { servicio, repo, tokens } = crearServicio([biblio]);

    const r = await servicio.actualizar('biblio-1', { activo: false }, admin);

    expect(repo.update).toHaveBeenCalledWith('biblio-1', {
      activo: false,
      actualizadoPor: 'admin-1',
    });
    expect(tokens.update).toHaveBeenCalledWith(
      expect.objectContaining({ usuarioId: 'biblio-1' }),
      { revocadoEn: expect.any(Date) as Date },
    );
    expect(r.activo).toBe(false);
  });

  it('HU-021 #4: cambiar rol no revoca sesiones; cambiar contraseña sí y la hashea', async () => {
    const { servicio, repo, tokens } = crearServicio([biblio]);

    await servicio.actualizar('biblio-1', { rol: Rol.ADMINISTRADOR }, admin);
    expect(tokens.update).not.toHaveBeenCalled();

    await servicio.actualizar('biblio-1', { password: 'nueva-clave' }, admin);
    expect(repo.update).toHaveBeenLastCalledWith('biblio-1', {
      passwordHash: 'hash(nueva-clave)',
      actualizadoPor: 'admin-1',
    });
    expect(tokens.update).toHaveBeenCalledTimes(1);
  });

  it('HU-021 #5: el Administrador no puede deshabilitarse ni quitarse el rol → 409', async () => {
    const { servicio, repo } = crearServicio([
      { ...biblio, id: 'admin-1', rol: Rol.ADMINISTRADOR },
    ]);

    await expect(
      servicio.actualizar('admin-1', { activo: false }, admin),
    ).rejects.toThrow(new ConflictException(SIN_AUTOBLOQUEO));
    await expect(
      servicio.actualizar('admin-1', { rol: Rol.BIBLIOTECARIO }, admin),
    ).rejects.toThrow(SIN_AUTOBLOQUEO);
    expect(repo.update).not.toHaveBeenCalled();

    // Sí puede cambiar su propia contraseña.
    await expect(
      servicio.actualizar('admin-1', { password: 'nueva-clave' }, admin),
    ).resolves.toMatchObject({ id: 'admin-1' });
  });

  it('HU-021: cuenta inexistente → 404', async () => {
    const { servicio } = crearServicio();

    await expect(
      servicio.actualizar('no-existe', { activo: true }, admin),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
