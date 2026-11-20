import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { hoyEnLima } from '../src/prestamos/dias-habiles.service';
import { createTestApp } from './utils/create-test-app';
import { accessTokenDe, usuariosDePrueba } from './utils/usuarios-de-prueba';

/** HU-005 · Devolución y marcado de vencidos (ST-31, ST-32, ST-38a). */
describe('HU-005 Devolución y vencidos (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let tokenBiblio: string;
  let tokenAdmin: string;
  const usuarios = usuariosDePrueba('e2e-devolucion');
  const base = Number(String(Date.now()).slice(-6)) * 10;
  let contador = 0;
  const lectores: string[] = [];
  let obraId: string;

  /** Fecha de hoy en Lima desplazada `dias` días (AAAA-MM-DD). */
  const diaRelativo = (dias: number) => {
    const d = new Date(`${hoyEnLima()}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + dias);
    return d.toISOString().slice(0, 10);
  };

  /** Crea lector, ejemplar y préstamo; devuelve sus identificadores. */
  const prestar = async (
    estado: 'VIGENTE' | 'VENCIDO' | 'DEVUELTO',
    fechaDevolucion: string,
  ) => {
    const n = contador++;
    const dni = `4${String(base + n).padStart(7, '0')}`;
    const [{ id: lectorId }]: Array<{ id: string }> = await dataSource.query(
      `INSERT INTO lectores (dni, nombres, apellidos, categoria, fecha_nacimiento)
       VALUES ($1, 'e2e', 'devolucion', 'DOCENTE', '1990-01-01') RETURNING id`,
      [dni],
    );
    lectores.push(lectorId);
    const codigo = `DV-${base}-${n}`.slice(0, 20);
    const [{ id: ejemplarId }]: Array<{ id: string }> = await dataSource.query(
      `INSERT INTO ejemplares (obra_id, codigo, estado) VALUES ($1, $2, $3) RETURNING id`,
      [obraId, codigo, estado === 'DEVUELTO' ? 'DISPONIBLE' : 'PRESTADO'],
    );
    const [{ id }]: Array<{ id: string }> = await dataSource.query(
      `INSERT INTO prestamos (lector_id, ejemplar_id, fecha_prestamo, fecha_devolucion, estado)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [lectorId, ejemplarId, diaRelativo(-10), fechaDevolucion, estado],
    );
    return { id, codigo, ejemplarId, dni, lectorId };
  };

  const estadoDe = async (id: string) =>
    (
      await dataSource.query<Array<{ estado: string; fecha_devuelto: string }>>(
        `SELECT estado, fecha_devuelto::text FROM prestamos WHERE id = $1`,
        [id],
      )
    )[0];

  const devolver = (id: string, token?: string) =>
    request(app.getHttpServer())
      .patch(`/prestamos/${id}/devolucion`)
      .set('Authorization', `Bearer ${token ?? tokenBiblio}`);

  const marcar = (token: string) =>
    request(app.getHttpServer())
      .post('/prestamos/vencidos/marcar')
      .set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    await usuarios.crear(app);
    tokenBiblio = await accessTokenDe(app, usuarios.biblio);
    tokenAdmin = await accessTokenDe(app, usuarios.admin);
    [{ id: obraId }] = await dataSource.query(
      `INSERT INTO obras (titulo, categoria, autores, fecha_publicacion, anio_edicion)
       VALUES ('e2e hu005', 'e2e', '{e2e}', '2000-01-01', 2000) RETURNING id`,
    );
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

  it('HU-005 #1: devolver un préstamo vigente lo deja Devuelto y libera el ejemplar', async () => {
    const p = await prestar('VIGENTE', diaRelativo(2));

    const buscado = await request(app.getHttpServer())
      .get('/prestamos/activo')
      .query({ codigoEjemplar: p.codigo.toLowerCase() })
      .set('Authorization', `Bearer ${tokenBiblio}`)
      .expect(200);
    const cuerpo = buscado.body as { id: string; lector: { dni: string } };
    expect(cuerpo.id).toBe(p.id);
    expect(cuerpo.lector.dni).toBe(`****${p.dni.slice(-4)}`);

    const res = await devolver(p.id).expect(200);

    expect(res.body).toMatchObject({ estado: 'DEVUELTO', conAtraso: false });
    expect((await estadoDe(p.id)).estado).toBe('DEVUELTO');
    const [ej] = await dataSource.query<Array<{ estado: string }>>(
      'SELECT estado FROM ejemplares WHERE id = $1',
      [p.ejemplarId],
    );
    expect(ej.estado).toBe('DISPONIBLE');

    // Usuario responsable y marca temporal (DoD-7).
    const [auditoria] = await dataSource.query<
      Array<{ actualizado_por: string | null; reciente: boolean }>
    >(
      `SELECT actualizado_por, actualizado_en > now() - interval '1 minute' AS reciente
       FROM prestamos WHERE id = $1`,
      [p.id],
    );
    expect(auditoria.actualizado_por).not.toBeNull();
    expect(auditoria.reciente).toBe(true);

    // RN-08: el índice único ya no bloquea un nuevo préstamo activo del lector.
    const [{ id: otroEjemplar }]: Array<{ id: string }> =
      await dataSource.query(
        `INSERT INTO ejemplares (obra_id, codigo, estado) VALUES ($1, $2, 'PRESTADO') RETURNING id`,
        [obraId, `${p.codigo}B`.slice(-20)],
      );
    await expect(
      dataSource.query(
        `INSERT INTO prestamos (lector_id, ejemplar_id, fecha_prestamo, fecha_devolucion, estado)
         VALUES ($1, $2, $3, $3, 'VIGENTE')`,
        [p.lectorId, otroEjemplar, hoyEnLima()],
      ),
    ).resolves.toBeDefined();
  });

  it('HU-005 #2: el marcado manual pasa a Vencido solo lo anterior a hoy (#8: hoy no se marca)', async () => {
    const ayer = await prestar('VIGENTE', diaRelativo(-1));
    const hoy = await prestar('VIGENTE', diaRelativo(0));

    const res = await marcar(tokenAdmin).expect(200);

    expect((res.body as { marcados: number }).marcados).toBeGreaterThanOrEqual(
      1,
    );
    expect((await estadoDe(ayer.id)).estado).toBe('VENCIDO');
    expect((await estadoDe(hoy.id)).estado).toBe('VIGENTE');
  });

  it('HU-005 #3: devolver un préstamo vencido conserva el atraso (fecha devuelto > pactada)', async () => {
    const p = await prestar('VENCIDO', diaRelativo(-3));

    const res = await devolver(p.id).expect(200);

    expect(res.body).toMatchObject({ estado: 'DEVUELTO', conAtraso: true });
    expect((await estadoDe(p.id)).fecha_devuelto).toBe(hoyEnLima());
  });

  it('HU-005 #4: un préstamo devuelto no cambia con el marcado', async () => {
    const p = await prestar('DEVUELTO', diaRelativo(-5));

    await marcar(tokenAdmin).expect(200);

    expect((await estadoDe(p.id)).estado).toBe('DEVUELTO');
  });

  it('HU-005 #5: devolver un préstamo ya devuelto → 409', async () => {
    const p = await prestar('VIGENTE', diaRelativo(2));
    await devolver(p.id).expect(200);

    await devolver(p.id).expect(409);
  });

  it('HU-005 #6: id o código inexistente → 404', async () => {
    await devolver('00000000-0000-4000-8000-000000000000').expect(404);
    await request(app.getHttpServer())
      .get('/prestamos/activo')
      .query({ codigoEjemplar: 'CEDIS-1900-999999' })
      .set('Authorization', `Bearer ${tokenBiblio}`)
      .expect(404);
  });

  it('HU-005 #7: el Administrador no registra devoluciones y el Bibliotecario no marca → 403', async () => {
    const p = await prestar('VIGENTE', diaRelativo(2));

    await devolver(p.id, tokenAdmin).expect(403);
    await marcar(tokenBiblio).expect(403);
    expect((await estadoDe(p.id)).estado).toBe('VIGENTE');
  });

  it('HU-005: sin token → 401', async () => {
    await request(app.getHttpServer())
      .post('/prestamos/vencidos/marcar')
      .expect(401);
  });
});
