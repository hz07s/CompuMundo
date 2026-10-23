import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { RefreshToken } from '../src/auth/entities/refresh-token.entity';
import { Usuario } from '../src/usuarios/entities/usuario.entity';
import { Rol } from '../src/usuarios/rol.enum';
import { createTestApp } from './utils/create-test-app';
import { accessTokenDe, usuariosDePrueba } from './utils/usuarios-de-prueba';

/**
 * HU-001 · Autenticación JWT y control de acceso por roles (ST-11).
 * Cada escenario Given-When-Then lleva su identificador en el nombre.
 */
describe('HU-001 Autenticación y autorización (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  const usuarios = usuariosDePrueba('e2e-auth');
  const MENSAJE_GENERICO = 'Usuario o contraseña incorrectos';

  const http = () => request(app.getHttpServer());

  /** Inicia sesión y devuelve la cookie del refresh token (refresh_token=...). */
  async function cookieDeLogin(credenciales = usuarios.biblio) {
    const res = await http().post('/auth/login').send(credenciales).expect(200);
    const cookie = [res.get('Set-Cookie') ?? []]
      .flat()
      .find((c) => c.startsWith('refresh_token='));
    if (!cookie) throw new Error('El login no devolvió la cookie');
    return cookie.split(';')[0];
  }

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    await usuarios.crear(app);
  });

  afterAll(async () => {
    await usuarios.borrar(app);
    await app.close();
  });

  describe('HU-001 #1: inicio de sesión con credenciales válidas', () => {
    it('HU-001 #1: emite el access token y la respuesta incluye el rol para la redirección', async () => {
      const res = await http()
        .post('/auth/login')
        .send(usuarios.biblio)
        .expect(200);

      expect(res.body).toMatchObject({
        accessToken: expect.any(String) as string,
        expiresIn: 8 * 3600,
        usuario: {
          nombreUsuario: usuarios.biblio.nombreUsuario,
          rol: Rol.BIBLIOTECARIO,
        },
      });
      expect(JSON.stringify(res.body)).not.toMatch(/password|\$2b\$/i);
    });

    it('HU-001 #1: el refresh token viaja solo en una cookie httpOnly limitada a /auth', async () => {
      const res = await http()
        .post('/auth/login')
        .send(usuarios.biblio)
        .expect(200);

      const cookie = [res.get('Set-Cookie') ?? []].flat().join(';');
      expect(cookie).toMatch(/refresh_token=/);
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/Path=\/auth/);
      expect(res.body).not.toHaveProperty('refreshToken');
    });

    it('HU-001 #1: con el access token se accede a las rutas protegidas', async () => {
      const token = await accessTokenDe(app, usuarios.biblio);

      const res = await http()
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body).toMatchObject({ rol: Rol.BIBLIOTECARIO });
    });
  });

  describe('HU-001 #2: credenciales incorrectas', () => {
    it('HU-001 #2: contraseña incorrecta → 401 con mensaje genérico y sin token', async () => {
      const res = await http()
        .post('/auth/login')
        .send({ ...usuarios.biblio, password: 'incorrecta' })
        .expect(401);

      expect(res.body).toMatchObject({ message: MENSAJE_GENERICO });
      expect(res.body).not.toHaveProperty('accessToken');
      expect(res.get('Set-Cookie')).toBeUndefined();
    });

    it('HU-001 #2: un usuario inexistente recibe exactamente el mismo mensaje', async () => {
      const res = await http()
        .post('/auth/login')
        .send({ nombreUsuario: 'no-existe-nadie', password: 'loquesea' })
        .expect(401);

      expect(res.body).toMatchObject({ message: MENSAJE_GENERICO });
    });

    it('HU-001 #2: un usuario dado de baja no puede entrar', async () => {
      const repo = dataSource.getRepository(Usuario);
      await repo.update(
        { nombreUsuario: usuarios.admin.nombreUsuario },
        { activo: false },
      );
      try {
        const res = await http()
          .post('/auth/login')
          .send(usuarios.admin)
          .expect(401);
        expect(res.body).toMatchObject({ message: MENSAJE_GENERICO });
      } finally {
        await repo.update(
          { nombreUsuario: usuarios.admin.nombreUsuario },
          { activo: true },
        );
      }
    });

    it('HU-001 #2: campos vacíos → 400 indicando cada campo', async () => {
      const res = await http().post('/auth/login').send({}).expect(400);

      expect(
        Object.keys((res.body as { errors: object }).errors).sort(),
      ).toEqual(['nombreUsuario', 'password']);
    });
  });

  describe('HU-001 #3: acceso según el rol', () => {
    it('HU-001 #3: una ruta protegida sin token responde 401', () => {
      return http().get('/auth/me').expect(401);
    });

    it('HU-001 #3: un access token vencido se rechaza con 401', async () => {
      const vencido = await app
        .get(JwtService)
        .signAsync(
          { sub: 'x', nombreUsuario: 'x', rol: Rol.ADMINISTRADOR },
          { expiresIn: -10 },
        );

      await http()
        .get('/auth/me')
        .set('Authorization', `Bearer ${vencido}`)
        .expect(401);
    });

    it('HU-001 #3: un token con firma inválida se rechaza con 401', async () => {
      const token = await accessTokenDe(app, usuarios.admin);
      const alterado = `${token.slice(0, -4)}AAAA`;

      await http()
        .get('/usuarios')
        .set('Authorization', `Bearer ${alterado}`)
        .expect(401);
    });

    it('HU-001 #3: un Bibliotecario en una función exclusiva del Administrador recibe 403', async () => {
      const token = await accessTokenDe(app, usuarios.biblio);

      await http()
        .get('/usuarios')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('HU-001 #3: el Administrador sí accede a su función', async () => {
      const token = await accessTokenDe(app, usuarios.admin);

      await http()
        .get('/usuarios')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  describe('HU-001 #4: contraseñas almacenadas como hash', () => {
    it('HU-001 #4: en la base de datos solo hay un hash Bcrypt, nunca el texto plano', async () => {
      const usuario = await dataSource.getRepository(Usuario).findOne({
        where: { nombreUsuario: usuarios.biblio.nombreUsuario },
        select: { passwordHash: true },
      });

      expect(usuario?.passwordHash).toMatch(/^\$2b\$\d{2}\$.{53}$/);
      expect(usuario?.passwordHash).not.toContain(usuarios.biblio.password);
    });
  });

  describe('Refresh y logout (ST-07)', () => {
    it('refresh emite un nuevo access token y rota la cookie', async () => {
      const cookie = await cookieDeLogin();

      const res = await http()
        .post('/auth/refresh')
        .set('Cookie', cookie)
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      const nueva = [res.get('Set-Cookie') ?? []].flat()[0];
      expect(nueva.split(';')[0]).not.toBe(cookie);
    });

    it('sin cookie, refresh responde 401', () => {
      return http().post('/auth/refresh').expect(401);
    });

    it('un refresh token ya rotado se rechaza y cierra todas las sesiones del usuario', async () => {
      const original = await cookieDeLogin();
      const rotada = await http()
        .post('/auth/refresh')
        .set('Cookie', original)
        .expect(200);
      const vigente = [rotada.get('Set-Cookie') ?? []].flat()[0].split(';')[0];

      await http().post('/auth/refresh').set('Cookie', original).expect(401);
      // La reutilización revoca también el token que estaba vigente.
      await http().post('/auth/refresh').set('Cookie', vigente).expect(401);
    });

    it('un refresh token vencido se rechaza con 401', async () => {
      const cookie = await cookieDeLogin(usuarios.admin);
      const admin = await dataSource
        .getRepository(Usuario)
        .findOneByOrFail({ nombreUsuario: usuarios.admin.nombreUsuario });
      await dataSource
        .getRepository(RefreshToken)
        .update(
          { usuarioId: admin.id },
          { expiraEn: new Date(Date.now() - 1000) },
        );

      await http().post('/auth/refresh').set('Cookie', cookie).expect(401);
    });

    it('logout revoca el refresh token: luego refresh responde 401', async () => {
      const cookie = await cookieDeLogin();

      await http().post('/auth/logout').set('Cookie', cookie).expect(204);
      await http().post('/auth/refresh').set('Cookie', cookie).expect(401);
    });

    it('logout sin cookie también responde 204', () => {
      return http().post('/auth/logout').expect(204);
    });
  });
});
