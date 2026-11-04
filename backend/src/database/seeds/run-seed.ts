import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { seedAdministrador } from '../../usuarios/seed-administrador';
import { buildDataSourceOptions } from '../typeorm.config';

async function main() {
  const dataSource = await new DataSource(
    buildDataSourceOptions(process.env),
  ).initialize();
  try {
    const rounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10);
    const resultado = await seedAdministrador(
      dataSource.getRepository(Usuario),
      {
        nombreUsuario: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
      },
      (password) => bcrypt.hash(password, rounds),
    );
    const mensajes = {
      creado: `Administrador "${process.env.ADMIN_USERNAME}" creado`,
      existente: `Administrador "${process.env.ADMIN_USERNAME}" ya existía, sin cambios`,
      omitido: 'ADMIN_USERNAME o ADMIN_PASSWORD no definidos, seed omitido',
    };
    console.log(`[seed] ${mensajes[resultado]}`);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error) => {
  console.error('[seed] Error:', error);
  process.exit(1);
});
