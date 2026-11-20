import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
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

  /**
   * Administrador que creó o modificó la cuenta (HU-021, DoD-7). No extiende
   * EntidadAuditada para no crear una importación circular con Usuario. Nulo
   * en cuentas del seed o anteriores a HU-021.
   */
  @Column({ name: 'creado_por', type: 'uuid', nullable: true })
  creadoPor!: string | null;

  // SET NULL: las cuentas no se borran (RNF-07), pero las pruebas sí limpian las suyas.
  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'creado_por' })
  creador?: Usuario | null;

  @Column({ name: 'actualizado_por', type: 'uuid', nullable: true })
  actualizadoPor!: string | null;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actualizado_por' })
  actualizador?: Usuario | null;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn!: Date;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamptz' })
  actualizadoEn!: Date;
}
