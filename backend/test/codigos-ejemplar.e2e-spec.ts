import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { CodigoEjemplarService } from '../src/catalogo/codigo-ejemplar.service';
import { createTestApp } from './utils/create-test-app';

// Años lejanos para no tocar la secuencia real.
const ANIO_PRUEBA = 2099;
const ANIO_ANTERIOR = 2098;
const enAnio = (anio: number) => new Date(`${anio}-06-15T12:00:00Z`);
const fecha = enAnio(ANIO_PRUEBA);

describe('Generador de códigos de ejemplar (e2e, ST-12 / ST-15)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let codigos: CodigoEjemplarService;

  const reservar = (cantidad: number, cuando = fecha) =>
    dataSource.transaction((manager) =>
      codigos.reservar(manager, cantidad, cuando),
    );
  const limpiar = () =>
    dataSource.query('DELETE FROM secuencias_codigo WHERE anio = ANY($1)', [
      [ANIO_PRUEBA, ANIO_ANTERIOR],
    ]);

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    codigos = app.get(CodigoEjemplarService);
  });

  beforeEach(limpiar);

  afterAll(async () => {
    await limpiar();
    await app.close();
  });

  it('formato: CEDIS-{AÑO}-{SECUENCIAL de 6 dígitos} empezando en 000001', async () => {
    await expect(reservar(1)).resolves.toEqual([`CEDIS-${ANIO_PRUEBA}-000001`]);
  });

  it('incremento: altas sucesivas continúan la secuencia sin repetir', async () => {
    const primera = await reservar(2);
    const segunda = await reservar(3);

    expect([...primera, ...segunda]).toEqual(
      [1, 2, 3, 4, 5].map(
        (n) => `CEDIS-${ANIO_PRUEBA}-${String(n).padStart(6, '0')}`,
      ),
    );
  });

  it('reinicio: al cambiar de año el secuencial vuelve a 000001', async () => {
    await reservar(4, enAnio(ANIO_ANTERIOR));

    const delAnioNuevo = await reservar(1, enAnio(ANIO_PRUEBA));

    expect(delAnioNuevo).toEqual([`CEDIS-${ANIO_PRUEBA}-000001`]);
    const filas: Array<{ anio: number; ultimo: number }> =
      await dataSource.query(
        'SELECT anio, ultimo FROM secuencias_codigo WHERE anio = ANY($1) ORDER BY anio',
        [[ANIO_ANTERIOR, ANIO_PRUEBA]],
      );
    expect(filas).toEqual([
      { anio: ANIO_ANTERIOR, ultimo: 4 },
      { anio: ANIO_PRUEBA, ultimo: 1 },
    ]);
  });

  it('concurrencia: N altas en paralelo producen N códigos distintos y consecutivos', async () => {
    const altas = 20;
    const porAlta = 3;

    const resultados = await Promise.all(
      Array.from({ length: altas }, () => reservar(porAlta)),
    );

    const todos = resultados.flat();
    expect(new Set(todos).size).toBe(altas * porAlta);
    expect([...todos].sort()).toEqual(
      Array.from(
        { length: altas * porAlta },
        (_, i) => `CEDIS-${ANIO_PRUEBA}-${String(i + 1).padStart(6, '0')}`,
      ),
    );
  });

  it('si la transacción del alta se revierte, el rango no se consume', async () => {
    await expect(
      dataSource.transaction(async (manager) => {
        await codigos.reservar(manager, 5, fecha);
        throw new Error('falla el alta');
      }),
    ).rejects.toThrow('falla el alta');

    await expect(reservar(1)).resolves.toEqual([`CEDIS-${ANIO_PRUEBA}-000001`]);
  });

  it('la base de datos rechaza un código de ejemplar repetido (UNIQUE)', async () => {
    const [{ id: obraId }]: Array<{ id: string }> = await dataSource.query(
      `INSERT INTO obras (titulo, categoria, autores, fecha_publicacion)
       VALUES ('e2e unique', 'e2e', '{e2e}', '2000-01-01') RETURNING id`,
    );
    const codigo = `CEDIS-${ANIO_PRUEBA}-999999`;
    try {
      await dataSource.query(
        'INSERT INTO ejemplares (obra_id, codigo) VALUES ($1, $2)',
        [obraId, codigo],
      );
      await expect(
        dataSource.query(
          'INSERT INTO ejemplares (obra_id, codigo) VALUES ($1, $2)',
          [obraId, codigo],
        ),
      ).rejects.toThrow(/unique|duplicate|duplicad/i);
    } finally {
      await dataSource.query('DELETE FROM ejemplares WHERE obra_id = $1', [
        obraId,
      ]);
      await dataSource.query('DELETE FROM obras WHERE id = $1', [obraId]);
    }
  });
});
