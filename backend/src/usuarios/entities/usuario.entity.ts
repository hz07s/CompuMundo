import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Rol } from '../rol.enum';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'nombre_usuario', length: 50, unique: true })
  nombreUsuario!: string;

  /** Solo el hash Bcrypt. No se selecciona por defecto para que nunca salga en respuestas. */
  @Column({ name: 'password_hash', length: 60, select: false })
  passwordHash!: string;

  @Column({ type: 'enum', enum: Rol, enumName: 'usuarios_rol_enum' })
  rol!: Rol;

  /** Baja lógica (RNF-07). */
  @Column({ default: true })
  activo!: boolean;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn!: Date;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamptz' })
  actualizadoEn!: Date;
}
