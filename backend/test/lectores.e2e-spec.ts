import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { createTestApp } from './utils/create-test-app';
import { accessTokenDe, usuariosDePrueba } from './utils/usuarios-de-prueba';

interface LectorRespuesta {
  id: string;
  dni: string;
  esMenor: boolean;
  activo: boolean;
  apoderadoDni: string | null;
  consentimientoApoderado: boolean;
}

/** Fecha de nacimiento de alguien con `anios` años cumplidos hoy (más `dias` de margen). */
function nacidoHaceAnios(anios: number, dias = 0): string {
  const f = new Date();
  f.setUTCFullYear(f.getUTCFullYear() - anios);
  f.setUTCDate(f.getUTCDate() - dias);
  return f.toISOString().slice(0, 10);
}

/**
 * HU-003 · Registrar lector con validación de DNI.
 * Cada escenario Given-When-Then lleva su identificador en el nombre.
 */
describe('HU-003 Registro de lectores (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let tokenBiblio: string;
  let tokenAdmin: string;
  let biblioId: string;
  const usuarios = usuariosDePrueba('e2e-lectores');
  const base = Number(String(Date.now()).slice(-6)) * 10;
  let siguiente = 0;
  const dniNuevo = () => `9${String(base + siguiente++).padStart(7, '0')}`;
  const dnisCreados: string[] = [];

  const valido = () => ({
    dni: dniNuevo(),
    nombres: 'Ana María',
    apellidos: 'Quispe Mamani',
    categoria: 'ESTUDIANTE',
    fechaNacimiento: nacidoHaceAnios(25),
  });

  const registrar = (body: object, token = tokenBiblio) =>
    request(app.getHttpServer())
      .post('/lectores')
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  const contarLectores = async () => {
    const [{ n }]: Array<{ n: string }> = await dataSource.query(
      'SELECT COUNT(*) AS n FROM lectores',
    );
    return Number(n);
  };

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    await usuarios.crear(app);
    tokenBiblio = await accessTokenDe(app, usuarios.biblio);
    tokenAdmin = await accessTokenDe(app, usuarios.admin);
    const [{ id }]: Array<{ id: string }> = await dataSource.query(
      'SELECT id FROM usuarios WHERE nombre_usuario = $1',
      [usuarios.biblio.nombreUsuario],
    );
    biblioId = id;
  });

  afterAll(async () => {
    if (dnisCreados.length) {
      await dataSource.query('DELETE FROM lectores WHERE dni = ANY($1)', [
        dnisCreados,
      ]);
    }
    await usuarios.borrar(app);
    await app.close();
  });

  describe('HU-003 #1: lector mayor de edad con DNI válido y nuevo', () => {
    it('HU-003 #1: queda registrado y activo, con usuario responsable y marca temporal', async () => {
      const body = valido();
      dnisCreados.push(body.dni);

      const res = await registrar(body).expect(201);
      const lector = res.body as LectorRespuesta;

      expect(lector).toMatchObject({
        activo: true,
        esMenor: false,
        apoderadoDni: null,
      });
      const [fila]: Array<{
        creado_por: string;
        actualizado_por: string;
        creado_en: Date;
        activo: boolean;
      }> = await dataSource.query(
        'SELECT creado_por, actualizado_por, creado_en, activo FROM lectores WHERE id = $1',
        [lector.id],
      );
      expect(fila.creado_por).toBe(biblioId);
      expect(fila.actualizado_por).toBe(biblioId);
      expect(fila.creado_en).toBeInstanceOf(Date);
      expect(fila.activo).toBe(true);
    });

    it('HU-003 #1: la respuesta muestra el DNI enmascarado, nunca completo (RNF-02)', async () => {
      const body = valido();
      dnisCreados.push(body.dni);

      const res = await registrar(body).expect(201);

      expect((res.body as LectorRespuesta).dni).toBe(
        `****${body.dni.slice(-4)}`,
      );
      expect(JSON.stringify(res.body)).not.toContain(body.dni);
    });
  });

  describe('HU-003 #2: DNI con formato inválido', () => {
    it.each(['1234567', '123456789', '1234567a', 'abcdefgh', '1234 678'])(
      'HU-003 #2: el DNI %p responde 400 con el error en el campo dni y no registra nada',
      async (dni) => {
        const antes = await contarLectores();

        const res = await registrar({ ...valido(), dni }).expect(400);

        const errores = (res.body as { errors: Record<string, string[]> })
          .errors;
        expect(Object.keys(errores)).toEqual(['dni']);
        expect(errores.dni[0]).toBe(
          'El DNI debe tener exactamente 8 dígitos numéricos',
        );
        expect(await contarLectores()).toBe(antes);
      },
    );

    it('HU-003: sin DNI se indica que es obligatorio', async () => {
      const sinDni: Partial<ReturnType<typeof valido>> = valido();
      delete sinDni.dni;

      const res = await registrar(sinDni).expect(400);

      expect(
        (res.body as { errors: Record<string, string[]> }).errors.dni[0],
      ).toBe('El DNI es obligatorio');
    });
  });

  describe('HU-003 #3: DNI duplicado', () => {
    it('HU-003 #3: responde 409 indicando que el DNI ya existe y no crea otro lector', async () => {
      const body = valido();
      dnisCreados.push(body.dni);
      await registrar(body).expect(201);
      const antes = await contarLectores();

      const res = await registrar({ ...body, nombres: 'Otra' }).expect(409);

      expect((res.body as { message: string }).message).toBe(
        'El DNI ya está registrado',
      );
      expect(await contarLectores()).toBe(antes);
    });

    it('HU-003 #3: dos altas simultáneas con el mismo DNI dejan un solo lector', async () => {
      const body = valido();
      dnisCreados.push(body.dni);

      const resultados = await Promise.all([registrar(body), registrar(body)]);

      expect(resultados.map((r) => r.status).sort()).toEqual([201, 409]);
    });
  });

  describe('HU-003 #5: lector menor de 18 años con apoderado', () => {
    const menor = () => ({
      ...valido(),
      fechaNacimiento: nacidoHaceAnios(12),
      apoderadoDni: '87654321',
      apoderadoNombre: 'Rosa Mamani',
      consentimientoApoderado: true,
    });

    it('HU-003 #5: queda registrado y activo con los datos del apoderado', async () => {
      const body = menor();
      dnisCreados.push(body.dni);

      const res = await registrar(body).expect(201);

      expect(res.body).toMatchObject({
        activo: true,
        esMenor: true,
        apoderadoDni: '****4321',
        apoderadoNombre: 'Rosa Mamani',
        consentimientoApoderado: true,
      });
    });

    it('HU-003 #5: el DNI del apoderado se valida con el mismo formato', async () => {
      const antes = await contarLectores();

      const res = await registrar({ ...menor(), apoderadoDni: '123' }).expect(
        400,
      );

      expect(Object.keys((res.body as { errors: object }).errors)).toEqual([
        'apoderadoDni',
      ]);
      expect(await contarLectores()).toBe(antes);
    });
  });

  describe('HU-003 #6: menor de edad sin apoderado o sin consentimiento', () => {
    it('HU-003 #6: sin datos del apoderado responde 400 indicando cada dato faltante', async () => {
      const antes = await contarLectores();
      const body = { ...valido(), fechaNacimiento: nacidoHaceAnios(10) };

      const res = await registrar(body).expect(400);

      expect(
        Object.keys((res.body as { errors: object }).errors).sort(),
      ).toEqual(['apoderadoDni', 'apoderadoNombre', 'consentimientoApoderado']);
      expect(await contarLectores()).toBe(antes);
    });

    it('HU-003 #6: sin el consentimiento firmado no se completa el alta', async () => {
      const antes = await contarLectores();
      const body = {
        ...valido(),
        fechaNacimiento: nacidoHaceAnios(15),
        apoderadoDni: '87654321',
        apoderadoNombre: 'Rosa Mamani',
        consentimientoApoderado: false,
      };

      const res = await registrar(body).expect(400);

      expect(Object.keys((res.body as { errors: object }).errors)).toEqual([
        'consentimientoApoderado',
      ]);
      expect(await contarLectores()).toBe(antes);
    });

    it('HU-003: quien cumple 18 años hoy se registra como mayor', async () => {
      const body = { ...valido(), fechaNacimiento: nacidoHaceAnios(18) };
      dnisCreados.push(body.dni);

      const res = await registrar(body).expect(201);

      expect((res.body as LectorRespuesta).esMenor).toBe(false);
    });

    it('HU-003: quien cumple 18 años mañana todavía es menor', async () => {
      const body = {
        ...valido(),
        fechaNacimiento: nacidoHaceAnios(18, -1),
      };

      const res = await registrar(body).expect(400);

      expect(
        (res.body as { errors: Record<string, string[]> }).errors,
      ).toHaveProperty('apoderadoDni');
    });
  });

  describe('Campos obligatorios y permisos', () => {
    it('HU-003: indica cada campo obligatorio omitido', async () => {
      const res = await registrar({}).expect(400);

      expect(
        Object.keys((res.body as { errors: object }).errors).sort(),
      ).toEqual([
        'apellidos',
        'categoria',
        'dni',
        'fechaNacimiento',
        'nombres',
      ]);
    });

    it('HU-003: un Administrador recibe 403 y no se registra nada', async () => {
      const antes = await contarLectores();

      await registrar(valido(), tokenAdmin).expect(403);

      expect(await contarLectores()).toBe(antes);
    });

    it('HU-003: sin token responde 401', () => {
      return request(app.getHttpServer())
        .post('/lectores')
        .send(valido())
        .expect(401);
    });
  });
});
