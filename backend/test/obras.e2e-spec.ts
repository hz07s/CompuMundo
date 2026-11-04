import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { createTestApp } from './utils/create-test-app';
import { accessTokenDe, usuariosDePrueba } from './utils/usuarios-de-prueba';

interface ObraRespuesta {
  id: string;
  totalEjemplares: number;
  disponibilidad: number;
  ejemplares: Array<{ codigo: string; estado: string }>;
}

/**
 * HU-002 · Registrar documento bibliográfico (ST-15).
 * Cada escenario Given-When-Then lleva su identificador en el nombre.
 */
describe('HU-002 Registro de obras y ejemplares (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let tokenBiblio: string;
  let tokenAdmin: string;
  const usuarios = usuariosDePrueba('e2e-obras');
  const marca = `e2e-obras-${Date.now()}`;
  const creadas: string[] = [];

  const valida = {
    titulo: `${marca} Cálculo diferencial`,
    categoria: 'Matemáticas',
    autores: ['James Stewart'],
    fechaPublicacion: '2012-01-15',
    cantidad: 3,
  };

  const contarObras = async () => {
    const [{ n }]: Array<{ n: string }> = await dataSource.query(
      'SELECT COUNT(*) AS n FROM obras',
    );
    return Number(n);
  };

  const crear = (body: object, token = tokenBiblio) =>
    request(app.getHttpServer())
      .post('/obras')
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    await usuarios.crear(app);
    tokenBiblio = await accessTokenDe(app, usuarios.biblio);
    tokenAdmin = await accessTokenDe(app, usuarios.admin);
  });

  afterAll(async () => {
    if (creadas.length) {
      await dataSource.query('DELETE FROM ejemplares WHERE obra_id = ANY($1)', [
        creadas,
      ]);
      await dataSource.query('DELETE FROM obras WHERE id = ANY($1)', [creadas]);
    }
    await usuarios.borrar(app);
    await app.close();
  });

  describe('HU-002 #1: registro con todos los campos y cantidad > 0', () => {
    it('HU-002 #1: registra la obra, un código único por ejemplar y disponibilidad = cantidad', async () => {
      const res = await crear(valida).expect(201);
      const obra = res.body as ObraRespuesta;
      creadas.push(obra.id);

      expect(obra).toMatchObject({
        totalEjemplares: 3,
        disponibilidad: 3,
      });
      const codigos = obra.ejemplares.map((e) => e.codigo);
      expect(codigos).toHaveLength(3);
      expect(new Set(codigos).size).toBe(3);
      codigos.forEach((c) => expect(c).toMatch(/^CEDIS-\d{4}-\d{6}$/));
      expect(obra.ejemplares.every((e) => e.estado === 'DISPONIBLE')).toBe(
        true,
      );
    });

    it('HU-002 #1: la obra aparece en el listado y en su detalle con la misma disponibilidad', async () => {
      const res = await crear({ ...valida, cantidad: 2 }).expect(201);
      const { id } = res.body as ObraRespuesta;
      creadas.push(id);

      const detalle = await request(app.getHttpServer())
        .get(`/obras/${id}`)
        .set('Authorization', `Bearer ${tokenBiblio}`)
        .expect(200);
      expect(detalle.body).toMatchObject({ disponibilidad: 2 });

      const lista = await request(app.getHttpServer())
        .get('/obras?page=1&limit=100')
        .set('Authorization', `Bearer ${tokenBiblio}`)
        .expect(200);
      const enLista = (lista.body as { data: ObraRespuesta[] }).data.find(
        (o) => o.id === id,
      );
      expect(enLista).toMatchObject({ disponibilidad: 2, totalEjemplares: 2 });
    });

    it('HU-002 #1: agregar ejemplares aumenta la disponibilidad con códigos nuevos', async () => {
      const res = await crear({ ...valida, cantidad: 1 }).expect(201);
      const obra = res.body as ObraRespuesta;
      creadas.push(obra.id);

      const despues = await request(app.getHttpServer())
        .post(`/obras/${obra.id}/ejemplares`)
        .set('Authorization', `Bearer ${tokenBiblio}`)
        .send({ cantidad: 2 })
        .expect(201);

      const actualizada = despues.body as ObraRespuesta;
      expect(actualizada.disponibilidad).toBe(3);
      expect(new Set(actualizada.ejemplares.map((e) => e.codigo)).size).toBe(3);
    });
  });

  describe('HU-002 #2: falta un campo obligatorio', () => {
    it.each(['titulo', 'categoria', 'autores', 'fechaPublicacion'] as const)(
      'HU-002 #2: sin %s responde 400 indicándolo y no registra nada',
      async (campo) => {
        const antes = await contarObras();
        const body: Partial<typeof valida> = { ...valida };
        delete body[campo];

        const res = await crear(body).expect(400);

        expect(Object.keys((res.body as { errors: object }).errors)).toEqual([
          campo,
        ]);
        expect(await contarObras()).toBe(antes);
      },
    );

    it('HU-002 #2: con varios campos faltantes los indica todos', async () => {
      const res = await crear({ cantidad: 1 }).expect(400);

      expect(
        Object.keys((res.body as { errors: object }).errors).sort(),
      ).toEqual(['autores', 'categoria', 'fechaPublicacion', 'titulo']);
    });
  });

  describe('HU-002 #3: cantidad no válida', () => {
    it.each([0, -3, 2.5, '3', null])(
      'HU-002 #3: cantidad %p se rechaza en el campo cantidad y no registra nada',
      async (cantidad) => {
        const antes = await contarObras();

        const res = await crear({ ...valida, cantidad }).expect(400);

        expect(Object.keys((res.body as { errors: object }).errors)).toEqual([
          'cantidad',
        ]);
        expect(await contarObras()).toBe(antes);
      },
    );
  });

  describe('Permisos (ST-08 / ST-13)', () => {
    it('un usuario sin el rol Bibliotecario recibe 403 y no se registra nada', async () => {
      const antes = await contarObras();

      await crear(valida, tokenAdmin).expect(403);

      expect(await contarObras()).toBe(antes);
    });

    it('sin token responde 401', () => {
      return request(app.getHttpServer())
        .post('/obras')
        .send(valida)
        .expect(401);
    });

    it('el detalle de una obra inexistente responde 404', () => {
      return request(app.getHttpServer())
        .get('/obras/00000000-0000-4000-8000-000000000000')
        .set('Authorization', `Bearer ${tokenBiblio}`)
        .expect(404);
    });
  });
});
