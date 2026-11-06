import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { createTestApp } from './utils/create-test-app';
import { accessTokenDe, usuariosDePrueba } from './utils/usuarios-de-prueba';

interface ObraRespuesta {
  id: string;
  volumen: number | null;
  anioEdicion: number;
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
    anioEdicion: 2012,
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

  describe('HU-002 RF-12: volumen y año de edición', () => {
    it('HU-002 RF-12: guarda y devuelve volumen y año de edición', async () => {
      const res = await crear({ ...valida, volumen: 2 }).expect(201);
      const obra = res.body as ObraRespuesta;
      creadas.push(obra.id);

      expect(obra).toMatchObject({ volumen: 2, anioEdicion: 2012 });
      const detalle = await request(app.getHttpServer())
        .get(`/obras/${obra.id}`)
        .set('Authorization', `Bearer ${tokenBiblio}`)
        .expect(200);
      expect(detalle.body).toMatchObject({ volumen: 2, anioEdicion: 2012 });
    });

    it('HU-002 RF-12: el volumen es opcional y queda en null', async () => {
      const res = await crear(valida).expect(201);
      const obra = res.body as ObraRespuesta;
      creadas.push(obra.id);

      expect(obra.volumen).toBeNull();
    });

    it.each([
      ['volumen', 0],
      ['anioEdicion', 99],
    ])('HU-002 RF-12: %s = %p se rechaza con 400', async (campo, valor) => {
      const antes = await contarObras();

      const res = await crear({ ...valida, [campo]: valor }).expect(400);

      expect(Object.keys((res.body as { errors: object }).errors)).toEqual([
        campo,
      ]);
      expect(await contarObras()).toBe(antes);
    });
  });

  describe('DoD-7 / RF-16: usuario responsable', () => {
    const responsables = async (obraId: string) => {
      const [obra]: Array<{ creado_por: string; actualizado_por: string }> =
        await dataSource.query(
          'SELECT creado_por, actualizado_por FROM obras WHERE id = $1',
          [obraId],
        );
      const ejemplares: Array<{ creado_por: string; actualizado_por: string }> =
        await dataSource.query(
          'SELECT creado_por, actualizado_por FROM ejemplares WHERE obra_id = $1',
          [obraId],
        );
      return { obra, ejemplares };
    };
    const idBiblio = async () => {
      const [{ id }]: Array<{ id: string }> = await dataSource.query(
        'SELECT id FROM usuarios WHERE nombre_usuario = $1',
        [usuarios.biblio.nombreUsuario],
      );
      return id;
    };

    it('DoD-7: el alta guarda al usuario responsable en la obra y en cada ejemplar', async () => {
      const res = await crear(valida).expect(201);
      const { id } = res.body as ObraRespuesta;
      creadas.push(id);
      const usuarioId = await idBiblio();

      const { obra, ejemplares } = await responsables(id);

      expect(obra).toEqual({
        creado_por: usuarioId,
        actualizado_por: usuarioId,
      });
      expect(ejemplares).toHaveLength(3);
      ejemplares.forEach((e) =>
        expect(e).toEqual({
          creado_por: usuarioId,
          actualizado_por: usuarioId,
        }),
      );
    });

    it('DoD-7: agregar ejemplares guarda al usuario responsable en los nuevos', async () => {
      const res = await crear({ ...valida, cantidad: 1 }).expect(201);
      const { id } = res.body as ObraRespuesta;
      creadas.push(id);

      await request(app.getHttpServer())
        .post(`/obras/${id}/ejemplares`)
        .set('Authorization', `Bearer ${tokenBiblio}`)
        .send({ cantidad: 2 })
        .expect(201);

      const usuarioId = await idBiblio();
      const { obra, ejemplares } = await responsables(id);
      expect(obra.actualizado_por).toBe(usuarioId);
      expect(ejemplares).toHaveLength(3);
      expect(ejemplares.every((e) => e.creado_por === usuarioId)).toBe(true);
    });
  });

  describe('HU-002 #2: falta un campo obligatorio', () => {
    it.each([
      'titulo',
      'categoria',
      'autores',
      'fechaPublicacion',
      'anioEdicion',
    ] as const)(
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
      ).toEqual([
        'anioEdicion',
        'autores',
        'categoria',
        'fechaPublicacion',
        'titulo',
      ]);
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
