import { join } from 'path';
import { DataSourceOptions } from 'typeorm';

/**
 * Opciones de TypeORM compartidas por la aplicación y por el CLI de
 * migraciones. El esquema se gestiona solo con migraciones: nunca synchronize.
 */
export function buildDataSourceOptions(env: {
  DATABASE_URL?: string;
  DATABASE_SSL?: string | boolean;
}): DataSourceOptions {
  const ssl = env.DATABASE_SSL === true || env.DATABASE_SSL === 'true';

  return {
    type: 'postgres',
    url: env.DATABASE_URL,
    ssl: ssl ? { rejectUnauthorized: false } : false,
    entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
    synchronize: false,
  };
}
