import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource, In } from 'typeorm';
import { PasswordService } from '../../src/auth/password.service';
import { Usuario } from '../../src/usuarios/entities/usuario.entity';
import { Rol } from '../../src/usuarios/rol.enum';

export interface Credenciales {
  nombreUsuario: string;
  password: string;
}

/**
 * Crea un Administrador y un Bibliotecario con nombres únicos para la suite
 * y los borra al final (sus refresh tokens caen por ON DELETE CASCADE).
 */
export function usuariosDePrueba(prefijo: string) {
  const sufijo = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  const admin: Credenciales = {
    nombreUsuario: `${prefijo}-admin-${sufijo}`,
    password: 'clave-admin-123',
  };
  const biblio: Credenciales = {
    nombreUsuario: `${prefijo}-biblio-${sufijo}`,
    password: 'clave-biblio-123',
  };

  return {
    admin,
    biblio,

    async crear(app: INestApplication<App>): Promise<void> {
      const passwords = app.get(PasswordService);
      await app
        .get(DataSource)
        .getRepository(Usuario)
        .insert([
          {
            nombreUsuario: admin.nombreUsuario,
            passwordHash: await passwords.hash(admin.password),
            rol: Rol.ADMINISTRADOR,
          },
          {
            nombreUsuario: biblio.nombreUsuario,
            passwordHash: await passwords.hash(biblio.password),
            rol: Rol.BIBLIOTECARIO,
          },
        ]);
    },

    async borrar(app: INestApplication<App>): Promise<void> {
      await app
        .get(DataSource)
        .getRepository(Usuario)
        .delete({
          nombreUsuario: In([admin.nombreUsuario, biblio.nombreUsuario]),
        });
    },
  };
}

/** Inicia sesión y devuelve el access token. */
export async function accessTokenDe(
  app: INestApplication<App>,
  credenciales: Credenciales,
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .send(credenciales)
    .expect(200);
  return (res.body as { accessToken: string }).accessToken;
}
