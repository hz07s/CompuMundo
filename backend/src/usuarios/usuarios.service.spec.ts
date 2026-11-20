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
  ULTIMO_ADMINISTRADOR,
  UsuariosService,
} from './usuarios.service';

const admin: UsuarioAutenticado = {
  id: 'admin-1',
  nombreUsuario: 'admin',
  rol: Rol.ADMINISTRADOR,
};
const creadoEn = new Date('2026-11-20T15:00:00Z');

function crearServicio(existentes: Partial<Usuario>[] = []) {
  // EntityManager de la transacción de `actualizar`.
  const bd = {
    findOne: jest.fn((_e: unknown, { where }: { where: { id: string } }) =>
      Promise.resolve(existentes.find((u) => u.id === where.id) ?? null),
    ),
    find: jest.fn(
      (_e: unknown, { where }: { where: { rol: Rol; activo: boolean } }) =>
        Promise.resolve(
          existentes.filter(
            (u) => u.rol === where.rol && u.activo === where.activo,
          ),
        ),
    ),
    // Tipado (entidad, criterio, cambios) para leer las llamadas sin `any`.
    update: jest.fn<Promise<{ affected: number }>, [unknown, unknown, unknown]>(
      () => Promise.resolve({ affected: 1 }),
    ),
  };
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
    create: jest.fn((u: Partial<Usuario>) => u),
    save: jest.fn((u: Partial<Usuario>) =>
      Promise.resolve({ id: 'nuevo', creadoEn, ...u }),
    ),
    manager: {
      transaction: jest.fn((trabajo: (m: typeof bd) => Promise<unknown>) =>
        trabajo(bd),
      ),
    },
  };
  const passwords = {
    hash: jest.fn((p: string) => Promise.resolve(`hash(${p})`)),
  };
  const servicio = new UsuariosService(
    repo as unknown as Repository<Usuario>,
    passwords as unknown as PasswordService,
  );
  /** Llamadas a update sobre la tabla de refresh tokens (revocaciones). */
  const revocaciones = () =>
    bd.update.mock.calls.filter(([entidad]) => entidad === RefreshToken);
  /** Cambios aplicados a la cuenta `id`. */
  const cambiosDe = (id: string) =>
    bd.update.mock.calls
      .filter(([entidad, clave]) => entidad === Usuario && clave === id)
      .map(([, , cambios]) => cambios as Partial<Usuario>);
  return { servicio, repo, bd, passwords, revocaciones, cambiosDe };
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
    const { servicio, revocaciones, cambiosDe } = crearServicio([biblio]);

    const r = await servicio.actualizar('biblio-1', { activo: false }, admin);

    expect(cambiosDe('biblio-1')).toEqual([
      { activo: false, actualizadoPor: 'admin-1' },
    ]);
    expect(revocaciones()).toHaveLength(1);
    expect(revocaciones()[0][1]).toMatchObject({ usuarioId: 'biblio-1' });
    expect(r.activo).toBe(false);
  });

  it('HU-021 #4: cambiar rol o contraseña revoca sesiones; reactivar no', async () => {
    const { servicio, revocaciones, cambiosDe } = crearServicio([
      { ...biblio, activo: false },
    ]);

    await servicio.actualizar('biblio-1', { activo: true }, admin);
    expect(revocaciones()).toHaveLength(0);

    await servicio.actualizar('biblio-1', { rol: Rol.ADMINISTRADOR }, admin);
    expect(revocaciones()).toHaveLength(1);

    await servicio.actualizar('biblio-1', { password: 'nueva-clave' }, admin);
    expect(cambiosDe('biblio-1').at(-1)).toEqual({
      passwordHash: 'hash(nueva-clave)',
      actualizadoPor: 'admin-1',
    });
    expect(revocaciones()).toHaveLength(2);
  });

  it('HU-021 #5: el Administrador no puede deshabilitarse ni quitarse el rol → 409', async () => {
    const { servicio, bd } = crearServicio([
      { ...biblio, id: 'admin-1', rol: Rol.ADMINISTRADOR },
    ]);

    await expect(
      servicio.actualizar('admin-1', { activo: false }, admin),
    ).rejects.toThrow(new ConflictException(SIN_AUTOBLOQUEO));
    await expect(
      servicio.actualizar('admin-1', { rol: Rol.BIBLIOTECARIO }, admin),
    ).rejects.toThrow(SIN_AUTOBLOQUEO);
    expect(bd.update).not.toHaveBeenCalled();

    // Sí puede cambiar su propia contraseña.
    await expect(
      servicio.actualizar('admin-1', { password: 'nueva-clave' }, admin),
    ).resolves.toMatchObject({ id: 'admin-1' });
  });

  it('HU-021 #5: no se puede deshabilitar ni degradar al último otro Administrador activo', async () => {
    // Quien actúa ya no figura como Administrador activo en la BD (p. ej. lo
    // deshabilitaron en paralelo): el otro es el último y debe conservarse.
    const { servicio, bd } = crearServicio([
      { ...biblio, id: 'admin-2', rol: Rol.ADMINISTRADOR },
    ]);

    await expect(
      servicio.actualizar('admin-2', { activo: false }, admin),
    ).rejects.toThrow(new ConflictException(ULTIMO_ADMINISTRADOR));
    await expect(
      servicio.actualizar('admin-2', { rol: Rol.BIBLIOTECARIO }, admin),
    ).rejects.toThrow(ULTIMO_ADMINISTRADOR);
    expect(bd.update).not.toHaveBeenCalled();
    expect(bd.find).toHaveBeenCalledWith(
      Usuario,
      expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
    );
  });

  it('HU-021 #5: con otro Administrador activo sí se puede deshabilitar', async () => {
    const { servicio, cambiosDe } = crearServicio([
      { ...biblio, id: 'admin-1', rol: Rol.ADMINISTRADOR },
      { ...biblio, id: 'admin-2', rol: Rol.ADMINISTRADOR },
    ]);

    await servicio.actualizar('admin-2', { activo: false }, admin);

    expect(cambiosDe('admin-2')).toHaveLength(1);
  });

  it('HU-021: cuenta inexistente → 404', async () => {
    const { servicio } = crearServicio();

    await expect(
      servicio.actualizar('no-existe', { activo: true }, admin),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
