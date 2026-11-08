import { Repository } from 'typeorm';
import { Usuario } from './entities/usuario.entity';
import { Rol } from './rol.enum';

export type ResultadoSeed = 'creado' | 'existente' | 'omitido';

/**
 * Crea el Administrador inicial si todavía no existe (P-21). Es idempotente:
 * si ya hay un usuario con ese nombre no lo modifica.
 */
export async function seedAdministrador(
  repo: Repository<Usuario>,
  credenciales: { nombreUsuario?: string; password?: string; email?: string },
  hashPassword: (password: string) => Promise<string>,
): Promise<ResultadoSeed> {
  const { nombreUsuario, password, email } = credenciales;
  if (!nombreUsuario || !password) return 'omitido';

  const existente = await repo.findOneBy({ nombreUsuario });
  if (existente) {
    if (email && !existente.email) {
      await repo.update(existente.id, { email });
    }
    return 'existente';
  }

  const datos: Partial<Usuario> = {
    nombreUsuario,
    passwordHash: await hashPassword(password),
    rol: Rol.ADMINISTRADOR,
  };
  if (email) datos.email = email;

  await repo.insert(datos);
  return 'creado';
}
