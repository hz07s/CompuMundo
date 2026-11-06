import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { createTestApp } from './utils/create-test-app';
import { accessTokenDe, usuariosDePrueba } from './utils/usuarios-de-prueba';

interface Verificacion {
  tienePrestamoActivo: boolean;
  morosidad: { estado: string; devolucionesTardias: number };
}

/** RN-02 · Morosidad: advertencia, bloqueo y desbloqueo por el Administrador (ST-29). */
describe('RN-02 Morosidad y desbloqueo (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let tokenBiblio: string;
  let tokenAdmin: string;
  let adminId: string;
  const usuarios = usuariosDePrueba('e2e-morosidad');
  const base = Number(String(Date.now()).slice(-6)) * 10;
  let contador = 0;
  const lectores: string[] = [];
  let obraId: string;
  let ejemplarSeq = 0;

  const nuevoLector = async () => {
    const dni = `3${String(base + contador++).padStart(7, '0')}`;
    const [{ id }]: Array<{ id: string }> = await dataSource.query(
      `INSERT INTO lectores (dni, nombres, apellidos, categoria, fecha_nacimiento)
       VALUES ($1, 'e2e', 'morosidad', 'DOCENTE', '1990-01-01') RETURNING id`,
      [dni],
    );
    lectores.push(id);
    return { id, dni };
  };

  /** Registra un préstamo ya devuelto, a tiempo o con atraso, en el orden dado. */
  const devolucion = async (
    lectorId: string,
    tarde: boolean,
    orden: number,
  ) => {
    const [{ id: ejemplarId }]: Array<{ id: string }> = await dataSource.query(
      `INSERT INTO ejemplares (obra_id, codigo, estado) VALUES ($1, $2, 'DISPONIBLE') RETURNING id`,
      [obraId, `MO-${base}-${ejemplarSeq++}`.slice(0, 20)],
    );
    const dia = String(orden).padStart(2, '0');
    await dataSource.query(
      `INSERT INTO prestamos (lector_id, ejemplar_id, fecha_prestamo, fecha_devolucion, fecha_devuelto, estado)
       VALUES ($1, $2, '2026-01-01', '2026-01-04', $3, 'DEVUELTO')`,
      [lectorId, ejemplarId, tarde ? `2026-01-${dia}` : '2026-01-03'],
    );
    // El orden entre devoluciones lo da la fecha devuelta (las tardías 10, 11, ...).
  };

  const verificar = async (dni: string) =>
    (
      await request(app.getHttpServer())
        .post('/lectores/verificacion')
        .set('Authorization', `Bearer ${tokenBiblio}`)
        .send({ dni })
        .expect(200)
    ).body as Verificacion;

  const desbloquear = (id: string, token: string, motivo?: string) =>
    request(app.getHttpServer())
      .post(`/lectores/${id}/desbloqueo`)
      .set('Authorization', `Bearer ${token}`)
      .send(motivo === undefined ? {} : { motivo });

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    await usuarios.crear(app);
    tokenBiblio = await accessTokenDe(app, usuarios.biblio);
    tokenAdmin = await accessTokenDe(app, usuarios.admin);
    [{ id: adminId }] = await dataSource.query(
      'SELECT id FROM usuarios WHERE nombre_usuario = $1',
      [usuarios.admin.nombreUsuario],
    );
    [{ id: obraId }] = await dataSource.query(
      `INSERT INTO obras (titulo, categoria, autores, fecha_publicacion, anio_edicion)
       VALUES ('e2e rn02', 'e2e', '{e2e}', '2000-01-01', 2000) RETURNING id`,
    );
  });

  afterAll(async () => {
    await dataSource.query(
      'DELETE FROM desbloqueos_lector WHERE lector_id = ANY($1)',
      [lectores],
    );
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

  describe('estado de morosidad en la verificación presencial', () => {
    it('un lector sin historial está libre y sin préstamo activo', async () => {
      const { dni } = await nuevoLector();

      const res = await verificar(dni);

      expect(res.morosidad).toMatchObject({
        estado: 'LIBRE',
        devolucionesTardias: 0,
      });
      expect(res.tienePrestamoActivo).toBe(false);
    });

    it('HU-004 #5: una devolución tardía da una advertencia (primera vez)', async () => {
      const { id, dni } = await nuevoLector();
      await devolucion(id, true, 10);

      const res = await verificar(dni);

      expect(res.morosidad.estado).toBe('ADVERTENCIA');
    });

    it('HU-004 #6: dos devoluciones tardías consecutivas bloquean', async () => {
      const { id, dni } = await nuevoLector();
      await devolucion(id, true, 10);
      await devolucion(id, true, 11);

      const res = await verificar(dni);

      expect(res.morosidad).toMatchObject({
        estado: 'BLOQUEADO',
        devolucionesTardias: 2,
      });
    });

    it('una devolución a tiempo regulariza: la última a tiempo deja al lector libre', async () => {
      const { id, dni } = await nuevoLector();
      await devolucion(id, true, 10);
      await devolucion(id, true, 11);
      // Más reciente que las tardías (fecha devuelta posterior).
      const [{ id: ejemplarId }]: Array<{ id: string }> =
        await dataSource.query(
          `INSERT INTO ejemplares (obra_id, codigo) VALUES ($1, $2) RETURNING id`,
          [obraId, `MO-${base}-${ejemplarSeq++}`.slice(0, 20)],
        );
      await dataSource.query(
        `INSERT INTO prestamos (lector_id, ejemplar_id, fecha_prestamo, fecha_devolucion, fecha_devuelto, estado)
         VALUES ($1, $2, '2026-02-01', '2026-02-04', '2026-02-03', 'DEVUELTO')`,
        [id, ejemplarId],
      );

      const res = await verificar(dni);

      expect(res.morosidad.estado).toBe('LIBRE');
    });

    it('RN-08: informa que el lector tiene un préstamo activo', async () => {
      const { id, dni } = await nuevoLector();
      const [{ id: ejemplarId }]: Array<{ id: string }> =
        await dataSource.query(
          `INSERT INTO ejemplares (obra_id, codigo) VALUES ($1, $2) RETURNING id`,
          [obraId, `MO-${base}-${ejemplarSeq++}`.slice(0, 20)],
        );
      await dataSource.query(
        `INSERT INTO prestamos (lector_id, ejemplar_id, fecha_prestamo, fecha_devolucion)
         VALUES ($1, $2, '2026-11-09', '2026-11-12')`,
        [id, ejemplarId],
      );

      const res = await verificar(dni);

      expect(res.tienePrestamoActivo).toBe(true);
    });
  });

  describe('desbloqueo por el Administrador', () => {
    const lectorBloqueado = async () => {
      const lector = await nuevoLector();
      await devolucion(lector.id, true, 10);
      await devolucion(lector.id, true, 11);
      return lector;
    };

    it('HU-004 #7: el Administrador desbloquea; queda su usuario y la marca temporal, y el lector vuelve a estar libre', async () => {
      const { id, dni } = await lectorBloqueado();

      const res = await desbloquear(id, tokenAdmin, 'Regularizó').expect(201);

      expect(res.body).toMatchObject({
        lectorId: id,
        motivo: 'Regularizó',
        desbloqueadoPor: adminId,
      });
      expect((res.body as { creadoEn: string }).creadoEn).toBeTruthy();
      const [fila]: Array<{ desbloqueado_por: string; creado_en: Date }> =
        await dataSource.query(
          'SELECT desbloqueado_por, creado_en FROM desbloqueos_lector WHERE lector_id = $1',
          [id],
        );
      expect(fila.desbloqueado_por).toBe(adminId);
      expect(fila.creado_en).toBeInstanceOf(Date);
      expect((await verificar(dni)).morosidad.estado).toBe('LIBRE');
    });

    it('HU-004 #8: un Bibliotecario recibe 403 y el lector sigue bloqueado', async () => {
      const { id, dni } = await lectorBloqueado();

      await desbloquear(id, tokenBiblio, 'Intento').expect(403);

      expect((await verificar(dni)).morosidad.estado).toBe('BLOQUEADO');
    });

    it('sin token responde 401', async () => {
      const { id } = await lectorBloqueado();

      await request(app.getHttpServer())
        .post(`/lectores/${id}/desbloqueo`)
        .send({ motivo: 'x' })
        .expect(401);
    });

    it('el motivo es obligatorio (400)', async () => {
      const { id } = await lectorBloqueado();

      const res = await desbloquear(id, tokenAdmin).expect(400);

      expect(Object.keys((res.body as { errors: object }).errors)).toEqual([
        'motivo',
      ]);
    });

    it('un lector que no está bloqueado responde 409', async () => {
      const { id } = await nuevoLector();

      await desbloquear(id, tokenAdmin, 'x').expect(409);
    });

    it('un lector inexistente responde 404', async () => {
      await desbloquear(
        '00000000-0000-4000-8000-000000000000',
        tokenAdmin,
        'x',
      ).expect(404);
    });

    it('un identificador que no es UUID responde 400', async () => {
      await desbloquear('no-es-uuid', tokenAdmin, 'x').expect(400);
    });

    it('si vuelve a devolver tarde después del desbloqueo, empieza de nuevo con una advertencia', async () => {
      const { id, dni } = await lectorBloqueado();
      await desbloquear(id, tokenAdmin, 'Regularizó').expect(201);
      // Una nueva devolución tardía, posterior al desbloqueo.
      await new Promise((r) => setTimeout(r, 20));
      await devolucion(id, true, 20);

      expect((await verificar(dni)).morosidad.estado).toBe('ADVERTENCIA');
    });
  });
});
