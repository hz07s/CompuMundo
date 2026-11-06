import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Lector } from '../../lectores/entities/lector.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

/**
 * Desbloqueo de un lector por morosidad (RN-02). Solo lo registra un
 * Administrador y queda en auditoría con su usuario y la marca temporal.
 * Las devoluciones tardías anteriores al desbloqueo dejan de contar.
 */
@Entity('desbloqueos_lector')
export class DesbloqueoLector {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'lector_id', type: 'uuid' })
  lectorId!: string;

  @ManyToOne(() => Lector, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'lector_id' })
  lector?: Lector;

  @Column({ type: 'text' })
  motivo!: string;

  @Column({ name: 'desbloqueado_por', type: 'uuid' })
  desbloqueadoPor!: string;

  @ManyToOne(() => Usuario, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'desbloqueado_por' })
  administrador?: Usuario;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn!: Date;
}
