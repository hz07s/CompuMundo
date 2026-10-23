import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsuarioResponseDto } from './dto/usuario-response.dto';
import { Usuario } from './entities/usuario.entity';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>,
  ) {}

  /** Lista el personal sin exponer nunca el hash de contraseña. */
  async listar(): Promise<UsuarioResponseDto[]> {
    const usuarios = await this.usuarios.find({
      order: { nombreUsuario: 'ASC' },
    });
    return usuarios.map(({ id, nombreUsuario, rol, activo, creadoEn }) => ({
      id,
      nombreUsuario,
      rol,
      activo,
      creadoEn,
    }));
  }
}
