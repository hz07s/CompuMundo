import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { createTestApp } from './utils/create-test-app';
import { accessTokenDe, usuariosDePrueba } from './utils/usuarios-de-prueba';

/** HU-007 · Verificación presencial: único contexto con el DNI completo. */
describe('HU-007 Verificación presencial del lector (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let tokenBiblio: string;
  let tokenAdmin: string;
  const usuarios = usuariosDePrueba('e2e-verif');
  const dni = `7${String(Date.now()).slice(-7)}`;

  const verificar = (body: object, token?: string) => {
    const req = request(app.getHttpServer()).post('/lectores/verificacion');
    if (token) req.set('Authorization', `Bearer ${token}`);
    return req.send(body);
  };

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    await usuarios.crear(app);
    tokenBiblio = await accessTokenDe(app, usuarios.biblio);
    tokenAdmin = await accessTokenDe(app, usuarios.admin);
    await dataSource.query(
      `INSERT INTO lectores (dni, nombres, apellidos, categoria, fecha_nacimiento)
       VALUES ($1, 'Ana', 'Quispe', 'ESTUDIANTE', '1990-01-01')`,
      [dni],
    );
  });

  afterAll(async () => {
    await dataSource.query('DELETE FROM lectores WHERE dni = $1', [dni]);
    await usuarios.borrar(app);
    await app.close();
  });

  it('HU-007 #2: el Bibliotecario ve el DNI completo en la verificación presencial', async () => {
    const res = await verificar({ dni }, tokenBiblio).expect(200);

    expect(res.body).toMatchObject({ dni, nombres: 'Ana', esMenor: false });
  });

  it('HU-007 #3: el Administrador ve el DNI completo en la pantalla de préstamo', async () => {
    const res = await verificar({ dni }, tokenAdmin).expect(200);

    expect((res.body as { dni: string }).dni).toBe(dni);
  });

  it('la respuesta no se guarda en caché del navegador', async () => {
    const res = await verificar({ dni }, tokenBiblio).expect(200);

    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('HU-004 A2: un DNI no registrado responde 404 indicando que debe registrar primero al lector', async () => {
    const res = await verificar({ dni: '10000001' }, tokenBiblio).expect(404);

    expect((res.body as { message: string }).message).toContain(
      'registrarlo primero',
    );
  });

  it('un DNI con formato inválido responde 400 en el campo dni', async () => {
    const res = await verificar({ dni: '123' }, tokenBiblio).expect(400);

    expect(Object.keys((res.body as { errors: object }).errors)).toEqual([
      'dni',
    ]);
  });

  it('sin token responde 401', () => verificar({ dni }).expect(401));
});
