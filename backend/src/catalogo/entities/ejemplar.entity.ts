import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Obra } from './obra.entity';

export enum EstadoEjemplar {
  DISPONIBLE = 'DISPONIBLE',
  PRESTADO = 'PRESTADO',
}

/** Copia física de una obra; es lo que se presta y devuelve (HU-004, HU-005). */
@Entity('ejemplares')
export class Ejemplar {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'obra_id', type: 'uuid' })
  obraId!: string;

  @ManyToOne(() => Obra, (obra) => obra.ejemplares, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'obra_id' })
  obra?: Obra;

  /** CEDIS-{AÑO}-{SECUENCIAL}, p. ej. CEDIS-2026-000001 (P-24). */
  @Column({ length: 20, unique: true })
  codigo!: string;

  @Column({
    type: 'enum',
    enum: EstadoEjemplar,
    default: EstadoEjemplar.DISPONIBLE,
  })
  estado!: EstadoEjemplar;

  /** Baja lógica (RNF-07). */
  @Column({ default: true })
  activo!: boolean;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn!: Date;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamptz' })
  actualizadoEn!: Date;
}
