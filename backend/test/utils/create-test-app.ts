import { INestApplication } from '@nestjs/common';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { setupApp } from '../../src/setup-app';

/**
 * Levanta la aplicación completa contra la BD de DATABASE_URL, con migraciones aplicadas.
 * `personalizar` permite reemplazar proveedores (p. ej. IDniValidator) antes de compilar.
 */
export async function createTestApp(
  personalizar?: (builder: TestingModuleBuilder) => TestingModuleBuilder,
): Promise<{
  app: INestApplication<App>;
  dataSource: DataSource;
}> {
  let builder = Test.createTestingModule({
    imports: [AppModule],
  });
  if (personalizar) builder = personalizar(builder);
  const moduleRef = await builder.compile();

  const app = moduleRef.createNestApplication<INestApplication<App>>();
  setupApp(app);
  await app.init();

  const dataSource = app.get(DataSource);
  await dataSource.runMigrations();
  return { app, dataSource };
}
