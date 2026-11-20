import { Client } from 'pg';

/**
 * BD exclusiva de los e2e (D-06): DATABASE_URL_TEST si está definida; si no, la
 * de DATABASE_URL con el sufijo `_test` en el nombre de la base. Así las
 * pruebas nunca tocan los datos de desarrollo y pueden vaciar tablas.
 */
export function urlDePruebas(env: NodeJS.ProcessEnv = process.env): string {
  if (env.DATABASE_URL_TEST) return env.DATABASE_URL_TEST;
  if (!env.DATABASE_URL) {
    throw new Error('Defina DATABASE_URL o DATABASE_URL_TEST para los e2e');
  }
  const url = new URL(env.DATABASE_URL);
  const nombre = url.pathname.slice(1);
  if (!nombre.endsWith('_test')) url.pathname = `/${nombre}_test`;
  return url.toString();
}

/** Nombre de la base de una URL de PostgreSQL. */
export function nombreDeBd(url: string): string {
  return decodeURIComponent(new URL(url).pathname.slice(1));
}

/** Crea la BD de pruebas si no existe, conectándose a `postgres` del mismo servidor. */
export async function asegurarBdDePruebas(url: string): Promise<void> {
  const nombre = nombreDeBd(url);
  if (!/^[\w-]+$/.test(nombre)) {
    throw new Error(`Nombre de BD de pruebas no válido: ${nombre}`);
  }
  const admin = new URL(url);
  admin.pathname = '/postgres';
  const cliente = new Client({ connectionString: admin.toString() });
  await cliente.connect();
  try {
    const { rowCount } = await cliente.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [nombre],
    );
    if (!rowCount) await cliente.query(`CREATE DATABASE "${nombre}"`);
  } finally {
    await cliente.end();
  }
}
