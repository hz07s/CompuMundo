import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { CodigoEjemplarService } from '../src/catalogo/codigo-ejemplar.service';
import { createTestApp } from './utils/create-test-app';

// Usa un año lejano para no tocar la secuencia real.
const ANIO_PRUEBA = 2099;
const fecha = new Date(`${ANIO_PRUEBA}-06-15T12:00:00Z`);

describe('Generador de códigos de ejemplar (e2e, ST-12)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let codigos: CodigoEjemplarService;

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    codigos = app.get(CodigoEjemplarService);
  });

  beforeEach(() =>
    dataSource.query('DELETE FROM secuencias_codigo WHERE anio = $1', [
      ANIO_PRUEBA,
    ]),
  );

  afterAll(async () => {
    await dataSource.query('DELETE FROM secuencias_codigo WHERE anio = $1', [
      ANIO_PRUEBA,
    ]);
    await app.close();
  });

  it('N altas en paralelo producen N códigos distintos y consecutivos', async () => {
    const altas = 20;
    const porAlta = 3;

    const resultados = await Promise.all(
      Array.from({ length: altas }, () =>
        dataSource.transaction((manager) =>
          codigos.reservar(manager, porAlta, fecha),
        ),
      ),
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

    const siguiente = await dataSource.transaction((manager) =>
      codigos.reservar(manager, 1, fecha),
    );
    expect(siguiente).toEqual([`CEDIS-${ANIO_PRUEBA}-000001`]);
  });
});
