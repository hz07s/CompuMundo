import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp } from './utils/create-test-app';

// Requiere PostgreSQL en DATABASE_URL (docker compose up -d o el servicio del CI).
describe('Plataforma (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    ({ app } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health responde 200 con la base de datos conectada', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          status: 'ok',
          info: { database: { status: 'up' } },
        });
      });
  });

  it('GET /api/docs-json expone la especificación OpenAPI', () => {
    return request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200)
      .expect(({ body }) => {
        expect((body as { paths: object }).paths).toHaveProperty('/health');
      });
  });
});
