import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PasswordService } from '../auth/password.service';
import { Usuario } from './entities/usuario.entity';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';

/** Personal del sistema: Administradores y Bibliotecarios (HU-021). */
@Module({
  imports: [TypeOrmModule.forFeature([Usuario])],
  controllers: [UsuariosController],
  // PasswordService (sin estado) también aquí: AuthModule ya importa este
  // módulo y la importación inversa sería circular.
  providers: [UsuariosService, PasswordService],
  exports: [TypeOrmModule],
})
export class UsuariosModule {}
