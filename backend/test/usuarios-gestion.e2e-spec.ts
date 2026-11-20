import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { createTestApp } from './utils/create-test-app';
import { accessTokenDe, usuariosDePrueba } from './utils/usuarios-de-prueba';

interface Cuenta {
  id: string;
  nombreUsuario: string;
  rol: string;
  activo: boolean;
}

/** HU-021 · Cuentas del personal administradas por el Administrador (RF-19). */
describe('HU-021 Cuentas del personal (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let tokenAdmin: string;
  let tokenBiblio: string;
  let idAdmin: string;
  const usuarios = usuariosDePrueba('e2e-cuentas');
  const sufijo = String(Date.now()).slice(-8);
  const nombre = `e2e.cuenta.${sufijo}`;
  const clave = 'clave-inicial-123';

  const http = () => request(app.getHttpServer());
  const comoAdmin = (r: request.Test) =>
    r.set('Authorization', `Bearer ${tokenAdmin}`);

  const login = (password: string) =>
    http().post('/auth/login').send({ nombreUsuario: nombre, password });

  const cookieDe = (res: request.Response) =>
    [res.get('Set-Cookie') ?? []]
      .flat()
      .find((c) => c.startsWith('refresh_token='))!
      .split(';')[0];

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    await usuarios.crear(app);
    tokenAdmin = await accessTokenDe(app, usuarios.admin);
    tokenBiblio = await accessTokenDe(app, usuarios.biblio);
    [{ id: idAdmin }] = await dataSource.query<Array<{ id: string }>>(
      'SELECT id FROM usuarios WHERE nombre_usuario = $1',
      [usuarios.admin.nombreUsuario],
    );
  });

  afterAll(async () => {
    await dataSource.query('DELETE FROM usuarios WHERE nombre_usuario = $1', [
      nombre,
    ]);
    await usuarios.borrar(app);
    await app.close();
  });

  let cuenta: Cuenta;

  it('HU-021 #1: el Administrador crea un Bibliotecario que puede iniciar sesión', async () => {
    const res = await comoAdmin(http().post('/usuarios'))
      .send({
        nombreUsuario: `  E2E.Cuenta.${sufijo} `,
        password: clave,
        rol: 'BIBLIOTECARIO',
      })
      .expect(201);
    cuenta = res.body as Cuenta;

    expect(cuenta).toMatchObject({
      nombreUsuario: nombre,
      rol: 'BIBLIOTECARIO',
      activo: true,
    });
    expect(res.body).not.toHaveProperty('passwordHash');
    const [fila] = await dataSource.query<
      Array<{ creado_por: string; password_hash: string }>
    >('SELECT creado_por, password_hash FROM usuarios WHERE id = $1', [
      cuenta.id,
    ]);
    expect(fila.creado_por).toBe(idAdmin);
    expect(fila.password_hash).toMatch(/^\$2[aby]\$/);

    const sesion = await login(clave).expect(200);
    expect(sesion.body).toMatchObject({ usuario: { rol: 'BIBLIOTECARIO' } });
  });

  it('HU-021 #2: nombre repetido → 409 y datos inválidos → 400 por campo', async () => {
    await comoAdmin(http().post('/usuarios'))
      .send({ nombreUsuario: nombre, password: clave, rol: 'BIBLIOTECARIO' })
      .expect(409);

    const res = await comoAdmin(http().post('/usuarios'))
      .send({ nombreUsuario: 'a b', password: 'corta', rol: 'LECTOR' })
      .expect(400);
    const errores = (res.body as { errors: Record<string, string[]> }).errors;
    expect(Object.keys(errores).sort()).toEqual([
      'nombreUsuario',
      'password',
      'rol',
    ]);
  });

  it('HU-021 #3: deshabilitar la cuenta impide el login y revoca la renovación de sesión', async () => {
    const cookie = cookieDe(await login(clave).expect(200));

    const res = await comoAdmin(http().patch(`/usuarios/${cuenta.id}`))
      .send({ activo: false })
      .expect(200);

    expect((res.body as Cuenta).activo).toBe(false);
    await login(clave).expect(401);
    await http().post('/auth/refresh').set('Cookie', cookie).expect(401);
    const [fila] = await dataSource.query<Array<{ actualizado_por: string }>>(
      'SELECT actualizado_por FROM usuarios WHERE id = $1',
      [cuenta.id],
    );
    expect(fila.actualizado_por).toBe(idAdmin);
  });

  it('HU-021 #4: reactivar y cambiar la contraseña; la anterior deja de valer', async () => {
    await comoAdmin(http().patch(`/usuarios/${cuenta.id}`))
      .send({ activo: true, password: 'clave-nueva-456' })
      .expect(200);

    await login(clave).expect(401);
    await login('clave-nueva-456').expect(200);
  });

  it('HU-021 #5: el Administrador no puede deshabilitarse a sí mismo → 409', async () => {
    await comoAdmin(http().patch(`/usuarios/${idAdmin}`))
      .send({ activo: false })
      .expect(409);
    await comoAdmin(http().patch(`/usuarios/${idAdmin}`))
      .send({ rol: 'BIBLIOTECARIO' })
      .expect(409);
  });

  it('HU-021: id inexistente → 404 y no UUID → 400', async () => {
    await comoAdmin(
      http().patch('/usuarios/00000000-0000-4000-8000-000000000000'),
    )
      .send({ activo: true })
      .expect(404);
    await comoAdmin(http().patch('/usuarios/no-es-uuid'))
      .send({ activo: true })
      .expect(400);
  });

  it('HU-021: el Bibliotecario no administra cuentas → 403; sin token → 401', async () => {
    await http()
      .post('/usuarios')
      .set('Authorization', `Bearer ${tokenBiblio}`)
      .send({ nombreUsuario: 'x-x-x', password: clave, rol: 'ADMINISTRADOR' })
      .expect(403);
    await http()
      .patch(`/usuarios/${cuenta.id}`)
      .send({ activo: false })
      .expect(401);
  });
});
