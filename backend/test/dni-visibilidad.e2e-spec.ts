import { INestApplication } from '@nestjs/common';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { createTestApp } from './utils/create-test-app';
import { accessTokenDe, usuariosDePrueba } from './utils/usuarios-de-prueba';

/**
 * HU-007 · Proteger el DNI según rol y contexto (ST-26).
 * Cada fila de la tabla de visibilidad de RNF-02 tiene su prueba.
 */
describe('HU-007 Visibilidad del DNI por rol y contexto (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let tokenBiblio: string;
  let tokenAdmin: string;
  const usuarios = usuariosDePrueba('e2e-visibilidad');
  const sufijo = String(Date.now()).slice(-6);
  const dni = `45${sufijo}`;
  const dniApoderado = `87${sufijo}`;
  const dnisCreados: string[] = [dni];

  const nacidoHaceAnios = (anios: number) => {
    const f = new Date();
    f.setUTCFullYear(f.getUTCFullYear() - anios);
    return f.toISOString().slice(0, 10);
  };

  const alta = (body: object, token = tokenBiblio) =>
    request(app.getHttpServer())
      .post('/lectores')
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  const verificar = (body: object, token: string) =>
    request(app.getHttpServer())
      .post('/lectores/verificacion')
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  const lectorMenor = {
    dni,
    nombres: 'Ana',
    apellidos: 'Quispe',
    categoria: 'ESTUDIANTE',
    fechaNacimiento: nacidoHaceAnios(12),
    apoderadoDni: dniApoderado,
    apoderadoNombre: 'Rosa Mamani',
    consentimientoApoderado: true,
  };

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    await usuarios.crear(app);
    tokenBiblio = await accessTokenDe(app, usuarios.biblio);
    tokenAdmin = await accessTokenDe(app, usuarios.admin);
    await alta(lectorMenor).expect(201);
  });

  afterAll(async () => {
    await dataSource.query('DELETE FROM lectores WHERE dni = ANY($1)', [
      dnisCreados,
    ]);
    await usuarios.borrar(app);
    await app.close();
  });

  describe('HU-007 #1: formato de la máscara', () => {
    it('HU-007 #1: el DNI se presenta con 4 asteriscos y los últimos 4 dígitos', async () => {
      const otro = `45${String(Number(sufijo) + 1).padStart(6, '0')}`;
      dnisCreados.push(otro);

      const res = await alta({
        ...lectorMenor,
        dni: otro,
        fechaNacimiento: nacidoHaceAnios(30),
      }).expect(201);

      expect((res.body as { dni: string }).dni).toBe(`****${otro.slice(-4)}`);
      expect((res.body as { dni: string }).dni).toMatch(/^\*{4}\d{4}$/);
    });
  });

  describe('HU-007 #2 y #3: pantalla de verificación presencial', () => {
    it.each([
      ['Bibliotecario', () => tokenBiblio],
      ['Administrador', () => tokenAdmin],
    ])('HU-007: el %s ve el DNI completo', async (_rol, token) => {
      const res = await verificar({ dni }, token()).expect(200);

      expect((res.body as { dni: string }).dni).toBe(dni);
    });

    it.each([
      ['Bibliotecario', () => tokenBiblio],
      ['Administrador', () => tokenAdmin],
    ])(
      'HU-007: incluso en la verificación, el DNI del apoderado queda enmascarado (%s)',
      async (_rol, token) => {
        const res = await verificar({ dni }, token()).expect(200);

        expect((res.body as { apoderadoDni: string }).apoderadoDni).toBe(
          `****${dniApoderado.slice(-4)}`,
        );
        expect(JSON.stringify(res.body)).not.toContain(dniApoderado);
      },
    );

    it('HU-007: la verificación no se guarda en caché', async () => {
      const res = await verificar({ dni }, tokenBiblio).expect(200);

      expect(res.headers['cache-control']).toBe('no-store');
    });
  });

  describe('HU-007 #4 y #6: el resto de contextos muestra el DNI enmascarado', () => {
    it('HU-007 #4: la respuesta del alta no contiene el DNI completo del lector ni del apoderado', async () => {
      const nuevo = `46${sufijo}`;
      dnisCreados.push(nuevo);

      const res = await alta({
        ...lectorMenor,
        dni: nuevo,
        apoderadoDni: `88${sufijo}`,
      }).expect(201);

      const texto = JSON.stringify(res.body);
      expect(texto).not.toContain(nuevo);
      expect(texto).not.toContain(`88${sufijo}`);
      expect(res.body).toMatchObject({
        dni: `****${nuevo.slice(-4)}`,
        apoderadoDni: `****${sufijo.slice(-4)}`,
      });
    });

    it('HU-007: un DNI repetido (409) no devuelve el DNI en el error', async () => {
      const res = await alta(lectorMenor).expect(409);

      expect(JSON.stringify(res.body)).not.toContain(dni);
    });

    it('HU-007: un DNI inválido (400) no devuelve el DNI en el error', async () => {
      const res = await alta({ ...lectorMenor, dni: '12345a78' }).expect(400);

      expect(JSON.stringify(res.body)).not.toContain('12345a78');
    });

    it('HU-007: un lector no encontrado (404) no devuelve el DNI en el error', async () => {
      const res = await verificar({ dni: '10000099' }, tokenBiblio).expect(404);

      expect(JSON.stringify(res.body)).not.toContain('10000099');
    });
  });

  describe('HU-007 #5: acceso por rol', () => {
    it('un usuario sin token no obtiene ningún DNI (401)', () => {
      return request(app.getHttpServer())
        .post('/lectores/verificacion')
        .send({ dni })
        .expect(401);
    });
  });

  describe('HU-007 #7: registros de la aplicación', () => {
    /** Código fuente (sin pruebas) que escribe en logs. */
    const archivosDeCodigo = (dir: string): string[] =>
      readdirSync(dir).flatMap((nombre) => {
        const ruta = join(dir, nombre);
        if (statSync(ruta).isDirectory()) return archivosDeCodigo(ruta);
        return ruta.endsWith('.ts') && !ruta.endsWith('.spec.ts') ? [ruta] : [];
      });

    it('HU-007 #7: ninguna llamada a un logger o a console menciona un DNI sin enmascararlo', () => {
      const llamadaALog =
        /(?:logger|Logger)\.(?:log|error|warn|debug|verbose)\s*\([^;]*\)|console\.\w+\s*\([^;]*\)/gs;
      const infractores: string[] = [];

      for (const archivo of archivosDeCodigo(join(__dirname, '..', 'src'))) {
        const codigo = readFileSync(archivo, 'utf8');
        for (const llamada of codigo.match(llamadaALog) ?? []) {
          const mencionaDni = /dni/i.test(llamada);
          const enmascara = /enmascarar/i.test(llamada);
          if (mencionaDni && !enmascara)
            infractores.push(`${archivo}: ${llamada}`);
        }
      }

      expect(infractores).toEqual([]);
    });

    it('HU-007 #7: el filtro global enmascara todo lo que escribe en el log', () => {
      const filtro = readFileSync(
        join(
          __dirname,
          '..',
          'src',
          'common',
          'filters',
          'http-exception.filter.ts',
        ),
        'utf8',
      );

      expect(filtro).toContain('enmascararDnisEnTexto');
    });
  });
});
