import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';

/**
 * Refresh token emitido (P-17). Solo se guarda el SHA-256 del token: el valor
 * real vive únicamente en la cookie httpOnly del cliente.
 */
@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'usuario_id', type: 'uuid' })
  usuarioId!: string;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario?: Usuario;

  @Column({ name: 'token_hash', length: 64, unique: true })
  tokenHash!: string;

  @Column({ name: 'expira_en', type: 'timestamptz' })
  expiraEn!: Date;

  /** Se llena al rotar o en logout. Un token revocado nunca vuelve a servir. */
  @Column({ name: 'revocado_en', type: 'timestamptz', nullable: true })
  revocadoEn!: Date | null;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn!: Date;
}
