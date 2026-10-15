import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../../app.module';
import { PasswordService } from '../../auth/password.service';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { seedAdministrador } from '../../usuarios/seed-administrador';

/** Seed del Administrador inicial. Reutiliza la configuración validada de la app. */
async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const config = app.get(ConfigService);
    const passwords = app.get(PasswordService);
    const nombreUsuario = config.get<string>('ADMIN_USERNAME');

    const resultado = await seedAdministrador(
      app.get<Repository<Usuario>>(getRepositoryToken(Usuario)),
      { nombreUsuario, password: config.get<string>('ADMIN_PASSWORD') },
      (password) => passwords.hash(password),
    );
    const mensajes = {
      creado: `Administrador "${nombreUsuario}" creado`,
      existente: `Administrador "${nombreUsuario}" ya existía, sin cambios`,
      omitido: 'ADMIN_USERNAME o ADMIN_PASSWORD no definidos, seed omitido',
    };
    // El logger de Nest está limitado a error/warn para no mostrar el arranque.
    console.log(`[seed] ${mensajes[resultado]}`);
  } finally {
    await app.close();
  }
}

void main();
