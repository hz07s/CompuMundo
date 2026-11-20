import { INestApplication } from '@nestjs/common';
import ExcelJS from 'exceljs';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { hoyEnLima } from '../src/prestamos/dias-habiles.service';
import { createTestApp } from './utils/create-test-app';
import { accessTokenDe, usuariosDePrueba } from './utils/usuarios-de-prueba';

interface Reporte {
  total: number;
  filas: Array<{ codigoEjemplar: string; dni: string; diasAtraso: number }>;
}

/** HU-006 · Reporte de morosidad (ST-34, ST-35, ST-38b). */
describe('HU-006 Reporte de morosidad (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let tokenBiblio: string;
  let tokenAdmin: string;
  const usuarios = usuariosDePrueba('e2e-reportes');
  const base = Number(String(Date.now()).slice(-6)) * 10;
  const dnis: string[] = [];
  const lectores: string[] = [];
  const codigos: string[] = [];
  let obraId: string;

  const diaRelativo = (dias: number) => {
    const d = new Date(`${hoyEnLima()}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + dias);
    return d.toISOString().slice(0, 10);
  };

  /** Préstamo Vigente con fecha pactada hace `atraso` días (el reporte lo marca). */
  const prestarAtrasado = async (n: number, atraso: number) => {
    const dni = `5${String(base + n).padStart(7, '0')}`;
    dnis.push(dni);
    const [{ id: lectorId }]: Array<{ id: string }> = await dataSource.query(
      `INSERT INTO lectores (dni, nombres, apellidos, categoria, fecha_nacimiento)
       VALUES ($1, 'e2e', 'reportes', 'DOCENTE', '1990-01-01') RETURNING id`,
      [dni],
    );
    lectores.push(lectorId);
    const codigo = `RP-${base}-${n}`.slice(0, 20);
    codigos.push(codigo);
    const [{ id: ejemplarId }]: Array<{ id: string }> = await dataSource.query(
      `INSERT INTO ejemplares (obra_id, codigo, estado) VALUES ($1, $2, 'PRESTADO') RETURNING id`,
      [obraId, codigo],
    );
    await dataSource.query(
      `INSERT INTO prestamos (lector_id, ejemplar_id, fecha_prestamo, fecha_devolucion, estado)
       VALUES ($1, $2, $3, $4, 'VIGENTE')`,
      [lectorId, ejemplarId, diaRelativo(-atraso - 5), diaRelativo(-atraso)],
    );
    return codigo;
  };

  const get = (ruta: string, token?: string) => {
    const r = request(app.getHttpServer()).get(ruta);
    return token ? r.set('Authorization', `Bearer ${token}`) : r;
  };

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    await usuarios.crear(app);
    tokenBiblio = await accessTokenDe(app, usuarios.biblio);
    tokenAdmin = await accessTokenDe(app, usuarios.admin);
    [{ id: obraId }] = await dataSource.query(
      `INSERT INTO obras (titulo, categoria, autores, fecha_publicacion, anio_edicion)
       VALUES ('e2e hu006', 'e2e', '{e2e}', '2000-01-01', 2000) RETURNING id`,
    );
    await prestarAtrasado(0, 3);
    await prestarAtrasado(1, 9);
  });

  afterAll(async () => {
    await dataSource.query('DELETE FROM prestamos WHERE lector_id = ANY($1)', [
      lectores,
    ]);
    await dataSource.query('DELETE FROM ejemplares WHERE obra_id = $1', [
      obraId,
    ]);
    await dataSource.query('DELETE FROM obras WHERE id = $1', [obraId]);
    await dataSource.query('DELETE FROM lectores WHERE id = ANY($1)', [
      lectores,
    ]);
    await usuarios.borrar(app);
    await app.close();
  });

  it('HU-006 #1: lista los vencidos (marcando antes) ordenados por atraso', async () => {
    const res = await get('/reportes/morosidad', tokenBiblio).expect(200);
    const cuerpo = res.body as Reporte;
    const propias = cuerpo.filas.filter((f) =>
      codigos.includes(f.codigoEjemplar),
    );
    expect(propias.map((f) => f.diasAtraso)).toEqual([9, 3]);
    expect(cuerpo.total).toBe(cuerpo.filas.length);
    const atrasos = cuerpo.filas.map((f) => f.diasAtraso);
    expect(atrasos).toEqual([...atrasos].sort((a, b) => b - a));
  });

  it('HU-006 #4: ninguna fila contiene un DNI completo', async () => {
    const res = await get('/reportes/morosidad', tokenAdmin).expect(200);
    const cuerpo = res.body as Reporte;
    for (const f of cuerpo.filas) expect(f.dni).toMatch(/^\*{4}\d{4}$/);
    for (const dni of dnis) expect(JSON.stringify(res.body)).not.toContain(dni);
  });

  it('HU-006 #2: exporta .xlsx con el mismo número de filas que la pantalla', async () => {
    const res = await get('/reportes/morosidad.xlsx', tokenBiblio)
      .buffer(true)
      .parse((r, cb) => {
        const trozos: Buffer[] = [];
        r.on('data', (t: Buffer) => trozos.push(t));
        r.on('end', () => cb(null, Buffer.concat(trozos)));
      })
      .expect(200);
    expect(res.headers['content-type']).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(res.headers['content-disposition']).toContain(
      `morosidad-${hoyEnLima()}.xlsx`,
    );
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(res.body as Buffer);
    const hoja = libro.getWorksheet('Morosidad')!;
    const pantalla = (await get('/reportes/morosidad', tokenBiblio))
      .body as Reporte;
    // Filas 1 (título), 2 (fecha) y 4 (encabezado) no son datos.
    expect(hoja.actualRowCount - 3).toBe(pantalla.total);
    let texto = '';
    hoja.eachRow((r) => (texto += JSON.stringify(r.values)));
    for (const dni of dnis) expect(texto).not.toContain(dni);
  });

  it('HU-006 #6: sin token → 401', async () => {
    await get('/reportes/morosidad').expect(401);
    await get('/reportes/morosidad.xlsx').expect(401);
  });
});
