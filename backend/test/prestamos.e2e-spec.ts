import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { DiasHabilesService } from '../src/prestamos/dias-habiles.service';
import { createTestApp } from './utils/create-test-app';
import { accessTokenDe, usuariosDePrueba } from './utils/usuarios-de-prueba';

interface PrestamoRespuesta {
  id: string;
  estado: string;
  fechaPrestamo: string;
  fechaDevolucion: string;
  justificacion: string | null;
  ejemplar: { codigo: string; titulo: string };
  lector: { dni: string };
}

/**
 * HU-004 · Registrar préstamo con fecha de devolución automática.
 * Cada escenario Given-When-Then lleva su identificador en el nombre.
 */
describe('HU-004 Registro de préstamos (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let tokenBiblio: string;
  let tokenAdmin: string;
  let biblioId: string;
  const usuarios = usuariosDePrueba('e2e-prestamos-api');
  const base = Number(String(Date.now()).slice(-6)) * 10;
  let seq = 0;
  const lectores: string[] = [];
  let obraId: string;

  const nuevoLector = async () => {
    const dni = `2${String(base + seq++).padStart(7, '0')}`;
    const [{ id }]: Array<{ id: string }> = await dataSource.query(
      `INSERT INTO lectores (dni, nombres, apellidos, categoria, fecha_nacimiento)
       VALUES ($1, 'Ana', 'Quispe', 'ESTUDIANTE', '1990-01-01') RETURNING id`,
      [dni],
    );
    lectores.push(id);
    return { id, dni };
  };
  const nuevoEjemplar = async (estado = 'DISPONIBLE') => {
    const codigo = `P4-${base}-${seq++}`.slice(0, 20);
    const [{ id }]: Array<{ id: string }> = await dataSource.query(
      `INSERT INTO ejemplares (obra_id, codigo, estado) VALUES ($1, $2, $3) RETURNING id`,
      [obraId, codigo, estado],
    );
    return { id, codigo };
  };
  /** Historial de devoluciones del lector (la más reciente al final). */
  const devolucion = async (lectorId: string, tarde: boolean, dia: number) => {
    const { id: ejemplarId } = await nuevoEjemplar();
    await dataSource.query(
      `INSERT INTO prestamos (lector_id, ejemplar_id, fecha_prestamo, fecha_devolucion, fecha_devuelto, estado)
       VALUES ($1, $2, '2026-01-01', '2026-01-04', $3, 'DEVUELTO')`,
      [
        lectorId,
        ejemplarId,
        tarde ? `2026-01-${String(dia).padStart(2, '0')}` : '2026-01-03',
      ],
    );
  };

  const registrar = (body: object, token = tokenBiblio) =>
    request(app.getHttpServer())
      .post('/prestamos')
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  const estadoDe = async (codigo: string) => {
    const [{ estado }]: Array<{ estado: string }> = await dataSource.query(
      'SELECT estado FROM ejemplares WHERE codigo = $1',
      [codigo],
    );
    return estado;
  };
  const contarPrestamos = async () => {
    const [{ n }]: Array<{ n: string }> = await dataSource.query(
      'SELECT COUNT(*) AS n FROM prestamos WHERE lector_id = ANY($1)',
      [lectores],
    );
    return Number(n);
  };

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    await usuarios.crear(app);
    tokenBiblio = await accessTokenDe(app, usuarios.biblio);
    tokenAdmin = await accessTokenDe(app, usuarios.admin);
    [{ id: biblioId }] = await dataSource.query(
      'SELECT id FROM usuarios WHERE nombre_usuario = $1',
      [usuarios.biblio.nombreUsuario],
    );
    [{ id: obraId }] = await dataSource.query(
      `INSERT INTO obras (titulo, categoria, autores, fecha_publicacion, anio_edicion)
       VALUES ('e2e hu-004', 'e2e', '{e2e}', '2000-01-01', 2000) RETURNING id`,
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

  describe('HU-004 #1: préstamo exitoso', () => {
    it('HU-004 #1: queda Vigente, con fecha de devolución a 3 días hábiles y el ejemplar prestado', async () => {
      const lector = await nuevoLector();
      const ejemplar = await nuevoEjemplar();

      const res = await registrar({
        lectorId: lector.id,
        codigoEjemplar: ejemplar.codigo,
      }).expect(201);

      const prestamo = res.body as PrestamoRespuesta;
      expect(prestamo.estado).toBe('VIGENTE');
      expect(prestamo.fechaDevolucion).toBe(
        app.get(DiasHabilesService).sumar(prestamo.fechaPrestamo),
      );
      expect(prestamo.fechaDevolucion > prestamo.fechaPrestamo).toBe(true);
      expect(prestamo.ejemplar).toEqual({
        codigo: ejemplar.codigo,
        titulo: 'e2e hu-004',
      });
      expect(await estadoDe(ejemplar.codigo)).toBe('PRESTADO');
    });

    it('HU-004 #1: la disponibilidad de la obra disminuye en 1', async () => {
      const lector = await nuevoLector();
      const ejemplar = await nuevoEjemplar();
      const disponibilidad = async () =>
        (
          (
            await request(app.getHttpServer())
              .get(`/obras/${obraId}`)
              .set('Authorization', `Bearer ${tokenBiblio}`)
              .expect(200)
          ).body as { disponibilidad: number }
        ).disponibilidad;
      const antes = await disponibilidad();

      await registrar({
        lectorId: lector.id,
        codigoEjemplar: ejemplar.codigo,
      }).expect(201);

      expect(await disponibilidad()).toBe(antes - 1);
    });

    it('HU-004 #1: se registra el usuario responsable y la marca temporal', async () => {
      const lector = await nuevoLector();
      const ejemplar = await nuevoEjemplar();

      const res = await registrar({
        lectorId: lector.id,
        codigoEjemplar: ejemplar.codigo,
      }).expect(201);

      const [fila]: Array<{
        creado_por: string;
        actualizado_por: string;
        creado_en: Date;
      }> = await dataSource.query(
        'SELECT creado_por, actualizado_por, creado_en FROM prestamos WHERE id = $1',
        [(res.body as PrestamoRespuesta).id],
      );
      expect(fila.creado_por).toBe(biblioId);
      expect(fila.actualizado_por).toBe(biblioId);
      expect(fila.creado_en).toBeInstanceOf(Date);
      const [{ actualizado_por }]: Array<{ actualizado_por: string }> =
        await dataSource.query(
          'SELECT actualizado_por FROM ejemplares WHERE codigo = $1',
          [ejemplar.codigo],
        );
      expect(actualizado_por).toBe(biblioId);
    });

    it('RNF-02: la respuesta muestra el DNI enmascarado, nunca completo', async () => {
      const lector = await nuevoLector();
      const ejemplar = await nuevoEjemplar();

      const res = await registrar({
        lectorId: lector.id,
        codigoEjemplar: ejemplar.codigo,
      }).expect(201);

      expect((res.body as PrestamoRespuesta).lector.dni).toBe(
        `****${lector.dni.slice(-4)}`,
      );
      expect(JSON.stringify(res.body)).not.toContain(lector.dni);
    });

    it('acepta el código del ejemplar en minúsculas', async () => {
      const lector = await nuevoLector();
      const ejemplar = await nuevoEjemplar();

      await registrar({
        lectorId: lector.id,
        codigoEjemplar: ejemplar.codigo.toLowerCase(),
      }).expect(201);
    });
  });

  describe('HU-004 #2 (A1): ejemplar no disponible', () => {
    it('HU-004 #2: un ejemplar ya prestado responde 409 y no registra el préstamo', async () => {
      const lector = await nuevoLector();
      const ejemplar = await nuevoEjemplar('PRESTADO');
      const antes = await contarPrestamos();

      const res = await registrar({
        lectorId: lector.id,
        codigoEjemplar: ejemplar.codigo,
      }).expect(409);

      expect((res.body as { message: string }).message).toBe(
        'El ejemplar no está disponible',
      );
      expect(await contarPrestamos()).toBe(antes);
    });

    it('un código que no existe responde 404', async () => {
      const lector = await nuevoLector();

      await registrar({
        lectorId: lector.id,
        codigoEjemplar: 'NO-EXISTE',
      }).expect(404);
    });
  });

  describe('HU-004 #3 (A2): lector no registrado', () => {
    it('HU-004 #3: indica que debe registrar primero al lector y no registra el préstamo', async () => {
      const ejemplar = await nuevoEjemplar();

      const res = await registrar({
        lectorId: '00000000-0000-4000-8000-000000000000',
        codigoEjemplar: ejemplar.codigo,
      }).expect(404);

      expect((res.body as { message: string }).message).toContain(
        'Debe registrarlo primero',
      );
      expect(await estadoDe(ejemplar.codigo)).toBe('DISPONIBLE');
    });
  });

  describe('HU-004 #4: lector con un préstamo activo (RN-08)', () => {
    it.each(['VIGENTE', 'VENCIDO'])(
      'HU-004 #4: un lector con un préstamo %s no puede recibir otro (409)',
      async (estado) => {
        const lector = await nuevoLector();
        const primero = await nuevoEjemplar();
        await dataSource.query(
          `INSERT INTO prestamos (lector_id, ejemplar_id, fecha_prestamo, fecha_devolucion, estado)
           VALUES ($1, $2, '2026-11-02', '2026-11-05', $3)`,
          [lector.id, primero.id, estado],
        );
        const segundo = await nuevoEjemplar();

        const res = await registrar({
          lectorId: lector.id,
          codigoEjemplar: segundo.codigo,
        }).expect(409);

        expect((res.body as { message: string }).message).toBe(
          'El lector ya tiene un préstamo activo',
        );
        expect(await estadoDe(segundo.codigo)).toBe('DISPONIBLE');
      },
    );

    it('un lector que devolvió su préstamo puede pedir otro', async () => {
      const lector = await nuevoLector();
      await devolucion(lector.id, false, 3);
      const ejemplar = await nuevoEjemplar();

      await registrar({
        lectorId: lector.id,
        codigoEjemplar: ejemplar.codigo,
      }).expect(201);
    });
  });

  describe('HU-004 #5: primera aplicación de RN-02 (advertencia)', () => {
    it('HU-004 #5: sin justificación responde 400 en el campo justificacion y no registra', async () => {
      const lector = await nuevoLector();
      await devolucion(lector.id, true, 10);
      const ejemplar = await nuevoEjemplar();

      const res = await registrar({
        lectorId: lector.id,
        codigoEjemplar: ejemplar.codigo,
      }).expect(400);

      expect(Object.keys((res.body as { errors: object }).errors)).toEqual([
        'justificacion',
      ]);
      expect(await estadoDe(ejemplar.codigo)).toBe('DISPONIBLE');
    });

    it('HU-004 #5: con justificación registra el préstamo y la guarda', async () => {
      const lector = await nuevoLector();
      await devolucion(lector.id, true, 10);
      const ejemplar = await nuevoEjemplar();

      const res = await registrar({
        lectorId: lector.id,
        codigoEjemplar: ejemplar.codigo,
        justificacion: 'Autorizado por la dirección',
      }).expect(201);

      expect((res.body as PrestamoRespuesta).justificacion).toBe(
        'Autorizado por la dirección',
      );
      const [{ justificacion }]: Array<{ justificacion: string }> =
        await dataSource.query(
          'SELECT justificacion FROM prestamos WHERE id = $1',
          [(res.body as PrestamoRespuesta).id],
        );
      expect(justificacion).toBe('Autorizado por la dirección');
    });

    it('una justificación de solo espacios cuenta como faltante', async () => {
      const lector = await nuevoLector();
      await devolucion(lector.id, true, 10);
      const ejemplar = await nuevoEjemplar();

      await registrar({
        lectorId: lector.id,
        codigoEjemplar: ejemplar.codigo,
        justificacion: '   ',
      }).expect(400);
    });
  });

  describe('HU-004 #6 y #7: segunda vez sin regularizar (bloqueo) y desbloqueo', () => {
    it('HU-004 #6: el lector bloqueado responde 409 aunque envíe justificación', async () => {
      const lector = await nuevoLector();
      await devolucion(lector.id, true, 10);
      await devolucion(lector.id, true, 11);
      const ejemplar = await nuevoEjemplar();

      const res = await registrar({
        lectorId: lector.id,
        codigoEjemplar: ejemplar.codigo,
        justificacion: 'Insisto',
      }).expect(409);

      expect((res.body as { message: string }).message).toContain(
        'Solo un Administrador puede desbloquearlo',
      );
      expect(await estadoDe(ejemplar.codigo)).toBe('DISPONIBLE');
    });

    it('HU-004 #7: tras el desbloqueo del Administrador, el lector puede recibir préstamos', async () => {
      const lector = await nuevoLector();
      await devolucion(lector.id, true, 10);
      await devolucion(lector.id, true, 11);
      const ejemplar = await nuevoEjemplar();
      await registrar({
        lectorId: lector.id,
        codigoEjemplar: ejemplar.codigo,
      }).expect(409);

      await request(app.getHttpServer())
        .post(`/lectores/${lector.id}/desbloqueo`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ motivo: 'Regularizó' })
        .expect(201);

      await registrar({
        lectorId: lector.id,
        codigoEjemplar: ejemplar.codigo,
      }).expect(201);
    });
  });

  describe('Datos inválidos y permisos', () => {
    it('señala cada campo obligatorio faltante', async () => {
      const res = await registrar({}).expect(400);

      expect(
        Object.keys((res.body as { errors: object }).errors).sort(),
      ).toEqual(['codigoEjemplar', 'lectorId']);
    });

    it('un lectorId que no es UUID responde 400 en ese campo', async () => {
      const res = await registrar({
        lectorId: '123',
        codigoEjemplar: 'X',
      }).expect(400);

      expect(Object.keys((res.body as { errors: object }).errors)).toEqual([
        'lectorId',
      ]);
    });

    it('HU-004: un Administrador recibe 403 y no se registra nada', async () => {
      const lector = await nuevoLector();
      const ejemplar = await nuevoEjemplar();

      await registrar(
        { lectorId: lector.id, codigoEjemplar: ejemplar.codigo },
        tokenAdmin,
      ).expect(403);

      expect(await estadoDe(ejemplar.codigo)).toBe('DISPONIBLE');
    });

    it('sin token responde 401', () => {
      return request(app.getHttpServer())
        .post('/prestamos')
        .send({})
        .expect(401);
    });
  });

  describe('Registros simultáneos', () => {
    it('dos préstamos del mismo ejemplar a lectores distintos: uno se registra y el otro recibe 409', async () => {
      const [a, b] = [await nuevoLector(), await nuevoLector()];
      const ejemplar = await nuevoEjemplar();

      const resultados = await Promise.all([
        registrar({ lectorId: a.id, codigoEjemplar: ejemplar.codigo }),
        registrar({ lectorId: b.id, codigoEjemplar: ejemplar.codigo }),
      ]);

      expect(resultados.map((r) => r.status).sort()).toEqual([201, 409]);
      const [{ n }]: Array<{ n: string }> = await dataSource.query(
        `SELECT COUNT(*) AS n FROM prestamos p JOIN ejemplares e ON e.id = p.ejemplar_id
         WHERE e.codigo = $1`,
        [ejemplar.codigo],
      );
      expect(Number(n)).toBe(1);
    });

    it('dos préstamos al mismo lector (RN-08): uno se registra y el otro recibe 409', async () => {
      const lector = await nuevoLector();
      const [e1, e2] = [await nuevoEjemplar(), await nuevoEjemplar()];

      const resultados = await Promise.all([
        registrar({ lectorId: lector.id, codigoEjemplar: e1.codigo }),
        registrar({ lectorId: lector.id, codigoEjemplar: e2.codigo }),
      ]);

      expect(resultados.map((r) => r.status).sort()).toEqual([201, 409]);
      const [{ n }]: Array<{ n: string }> = await dataSource.query(
        `SELECT COUNT(*) AS n FROM prestamos WHERE lector_id = $1`,
        [lector.id],
      );
      expect(Number(n)).toBe(1);
      // El ejemplar del préstamo rechazado no queda marcado como prestado.
      const estados = [await estadoDe(e1.codigo), await estadoDe(e2.codigo)];
      expect(estados.sort()).toEqual(['DISPONIBLE', 'PRESTADO']);
    });
  });

  describe('Consulta rápida de disponibilidad (RNF-05)', () => {
    it('responde la disponibilidad del ejemplar en menos de 2 segundos', async () => {
      const ejemplar = await nuevoEjemplar();
      const inicio = Date.now();

      const res = await request(app.getHttpServer())
        .get(`/ejemplares/${ejemplar.codigo}`)
        .set('Authorization', `Bearer ${tokenBiblio}`)
        .expect(200);

      expect(Date.now() - inicio).toBeLessThan(2000);
      expect(res.body).toMatchObject({
        codigo: ejemplar.codigo,
        estado: 'DISPONIBLE',
        disponible: true,
        obra: { id: obraId, titulo: 'e2e hu-004' },
      });
    });

    it('un ejemplar prestado se informa como no disponible', async () => {
      const ejemplar = await nuevoEjemplar('PRESTADO');

      const res = await request(app.getHttpServer())
        .get(`/ejemplares/${ejemplar.codigo}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);

      expect(res.body).toMatchObject({ estado: 'PRESTADO', disponible: false });
    });

    it('un código inexistente responde 404 y sin token, 401', async () => {
      await request(app.getHttpServer())
        .get('/ejemplares/NO-EXISTE')
        .set('Authorization', `Bearer ${tokenBiblio}`)
        .expect(404);
      await request(app.getHttpServer())
        .get('/ejemplares/NO-EXISTE')
        .expect(401);
    });
  });
});
