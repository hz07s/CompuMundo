import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { DNI_VALIDATOR } from '../src/lectores/validacion/dni-validator.interface';
import { createTestApp } from './utils/create-test-app';
import { accessTokenDe, usuariosDePrueba } from './utils/usuarios-de-prueba';

/**
 * HU-003 #4 · La validación del DNI se hace exclusivamente mediante
 * IDniValidator, de modo que pueda reemplazarse (RNF-11, ADR-011).
 */
describe('HU-003 #4 Validación mediante IDniValidator reemplazable (e2e)', () => {
  const sufijo = String(Date.now()).slice(-6);
  const dni = `51${sufijo}`;
  const dniApoderado = `52${sufijo}`;
  const lector = {
    dni,
    nombres: 'Ana',
    apellidos: 'Quispe',
    categoria: 'DOCENTE',
    fechaNacimiento: '1990-01-01',
  };

  async function conValidador(
    validar: (dni: string) => Promise<boolean>,
    prueba: (ctx: {
      app: INestApplication<App>;
      dataSource: DataSource;
      token: string;
    }) => Promise<void>,
  ) {
    const usuarios = usuariosDePrueba('e2e-validador');
    const { app, dataSource } = await createTestApp((b) =>
      b.overrideProvider(DNI_VALIDATOR).useValue({ validar }),
    );
    try {
      await usuarios.crear(app);
      const token = await accessTokenDe(app, usuarios.biblio);
      await prueba({ app, dataSource, token });
    } finally {
      await dataSource.query('DELETE FROM lectores WHERE dni = ANY($1)', [
        [dni, dniApoderado],
      ]);
      await usuarios.borrar(app);
      await app.close();
    }
  }

  const alta = (app: INestApplication<App>, token: string, body: object) =>
    request(app.getHttpServer())
      .post('/lectores')
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  it('con un validador que rechaza, un DNI de formato correcto no se registra', async () => {
    await conValidador(
      () => Promise.resolve(false),
      async ({ app, dataSource, token }) => {
        const res = await alta(app, token, lector).expect(400);

        expect(Object.keys((res.body as { errors: object }).errors)).toEqual([
          'dni',
        ]);
        const [{ n }]: Array<{ n: string }> = await dataSource.query(
          'SELECT COUNT(*) AS n FROM lectores WHERE dni = $1',
          [dni],
        );
        expect(Number(n)).toBe(0);
      },
    );
  });

  it('con un validador que acepta, el alta se completa usando solo su resultado', async () => {
    const consultados: string[] = [];
    await conValidador(
      (valor) => {
        consultados.push(valor);
        return Promise.resolve(true);
      },
      async ({ app, token }) => {
        await alta(app, token, lector).expect(201);

        expect(consultados).toEqual([dni]);
      },
    );
  });

  it('el DNI del apoderado de un menor pasa por el mismo validador', async () => {
    const consultados: string[] = [];
    await conValidador(
      (valor) => {
        consultados.push(valor);
        return Promise.resolve(true);
      },
      async ({ app, token }) => {
        const nacido = new Date();
        nacido.setUTCFullYear(nacido.getUTCFullYear() - 10);

        await alta(app, token, {
          ...lector,
          fechaNacimiento: nacido.toISOString().slice(0, 10),
          apoderadoDni: dniApoderado,
          apoderadoNombre: 'Rosa Mamani',
          consentimientoApoderado: true,
        }).expect(201);

        expect(consultados).toEqual([dni, dniApoderado]);
      },
    );
  });

  it('la verificación presencial también valida mediante la interfaz', async () => {
    const consultados: string[] = [];
    await conValidador(
      (valor) => {
        consultados.push(valor);
        return Promise.resolve(false);
      },
      async ({ app, token }) => {
        await request(app.getHttpServer())
          .post('/lectores/verificacion')
          .set('Authorization', `Bearer ${token}`)
          .send({ dni })
          .expect(400);

        expect(consultados).toEqual([dni]);
      },
    );
  });
});
