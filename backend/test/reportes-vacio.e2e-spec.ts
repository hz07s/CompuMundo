import { INestApplication } from '@nestjs/common';
import ExcelJS from 'exceljs';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { SIN_VENCIDOS } from '../src/reportes/exportadores/columnas';
import { createTestApp } from './utils/create-test-app';
import { accessTokenDe, usuariosDePrueba } from './utils/usuarios-de-prueba';

/**
 * HU-006 #5 · Reporte sin vencidos (D-06). Necesita una BD sin morosos, por
 * eso solo corre contra la BD exclusiva de pruebas (sufijo `_test`).
 */
describe('HU-006 Reporte de morosidad vacío (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let token: string;
  const usuarios = usuariosDePrueba('e2e-reporte-vacio');

  const binario = (ruta: string) =>
    request(app.getHttpServer())
      .get(ruta)
      .set('Authorization', `Bearer ${token}`)
      .buffer(true)
      .parse((r, cb) => {
        const trozos: Buffer[] = [];
        r.on('data', (t: Buffer) => trozos.push(t));
        r.on('end', () => cb(null, Buffer.concat(trozos)));
      })
      .expect(200);

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    const [{ bd }] = await dataSource.query<Array<{ bd: string }>>(
      'SELECT current_database() AS bd',
    );
    if (!bd.endsWith('_test')) {
      throw new Error(`Se negó a vaciar préstamos en la BD "${bd}"`);
    }
    // Ningún préstamo activo: nada vencido ni nada que el reporte vaya a marcar.
    await dataSource.query(
      `DELETE FROM prestamos WHERE estado IN ('VIGENTE', 'VENCIDO')`,
    );
    await usuarios.crear(app);
    token = await accessTokenDe(app, usuarios.biblio);
  });

  afterAll(async () => {
    await usuarios.borrar(app);
    await app.close();
  });

  it('HU-006 #5: sin vencidos la pantalla recibe total 0 y filas vacías', async () => {
    const res = await request(app.getHttpServer())
      .get('/reportes/morosidad')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toMatchObject({ total: 0, filas: [] });
  });

  it('HU-006 #5: el Excel vacío dice "No hay préstamos vencidos"', async () => {
    const res = await binario('/reportes/morosidad.xlsx');
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(res.body as ArrayBuffer);
    let texto = '';
    libro.getWorksheet('Morosidad')!.eachRow((r) => {
      texto += JSON.stringify(r.values);
    });

    expect(texto).toContain(SIN_VENCIDOS);
  });

  it('HU-006 #5: el PDF vacío se genera igual', async () => {
    const res = await binario('/reportes/morosidad.pdf');

    expect((res.body as Buffer).subarray(0, 4).toString()).toBe('%PDF');
  });
});
