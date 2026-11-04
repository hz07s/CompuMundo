import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { Usuario } from '../src/usuarios/entities/usuario.entity';
import { Rol } from '../src/usuarios/rol.enum';
import { createTestApp } from './utils/create-test-app';

describe('Modelo de usuarios (e2e, ST-06)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let repo: Repository<Usuario>;
  const nombreUsuario = `e2e-unico-${Date.now()}`;

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    repo = dataSource.getRepository(Usuario);
  });

  afterAll(async () => {
    await repo.delete({ nombreUsuario });
    await app.close();
  });

  it('no permite dos usuarios con el mismo nombre de usuario', async () => {
    const usuario = {
      nombreUsuario,
      passwordHash: '$2b$10$'.padEnd(60, 'x'),
      rol: Rol.BIBLIOTECARIO,
    };
    await repo.insert(usuario);

    await expect(repo.insert(usuario)).rejects.toBeInstanceOf(QueryFailedError);
  });

  it('no existe ninguna columna de contraseña en texto plano', async () => {
    const columnas: Array<{ column_name: string }> = await dataSource.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'usuarios'`,
    );
    const nombres = columnas.map((c) => c.column_name);

    expect(nombres).toContain('password_hash');
    expect(nombres).not.toContain('password');
  });
});
