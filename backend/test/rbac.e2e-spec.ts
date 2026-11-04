import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp } from './utils/create-test-app';
import { accessTokenDe, usuariosDePrueba } from './utils/usuarios-de-prueba';

describe('Autorización por rol (e2e, ST-08)', () => {
  let app: INestApplication<App>;
  const usuarios = usuariosDePrueba('e2e-rbac');

  beforeAll(async () => {
    ({ app } = await createTestApp());
    await usuarios.crear(app);
  });

  afterAll(async () => {
    await usuarios.borrar(app);
    await app.close();
  });

  it('sin token responde 401', () => {
    return request(app.getHttpServer()).get('/usuarios').expect(401);
  });

  it('un Bibliotecario en una función exclusiva del Administrador recibe 403', async () => {
    const token = await accessTokenDe(app, usuarios.biblio);

    await request(app.getHttpServer())
      .get('/usuarios')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('el Administrador accede y la respuesta no incluye hashes', async () => {
    const token = await accessTokenDe(app, usuarios.admin);

    const res = await request(app.getHttpServer())
      .get('/usuarios')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(JSON.stringify(res.body)).not.toContain('$2b$');
  });

  it('las rutas públicas siguen accesibles sin token', () => {
    return request(app.getHttpServer()).get('/health').expect(200);
  });
});
