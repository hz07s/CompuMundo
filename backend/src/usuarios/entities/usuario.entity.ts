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
  @Column({
    type: 'varchar',
    name: 'password_hash',
    length: 60,
    nullable: true,
    select: false,
  })
  passwordHash!: string | null;

  @Column({
    type: 'varchar',
    name: 'email',
    length: 120,
    unique: true,
    nullable: true,
  })
  email!: string | null;

  @Column({
    type: 'varchar',
    name: 'google_id',
    length: 100,
    unique: true,
    nullable: true,
  })
  googleId!: string | null;

  @Column({ type: 'enum', enum: Rol })
  rol!: Rol;

  /** Baja lógica (RNF-07). */
  @Column({ default: true })
  activo!: boolean;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn!: Date;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamptz' })
  actualizadoEn!: Date;
}
