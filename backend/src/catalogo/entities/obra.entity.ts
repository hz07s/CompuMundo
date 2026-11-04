import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Ejemplar } from './ejemplar.entity';

/** Documento bibliográfico (P-18). Sus copias físicas son los ejemplares. */
@Entity('obras')
export class Obra {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 255 })
  titulo!: string;

  @Column({ length: 100 })
  categoria!: string;

  @Column('text', { array: true })
  autores!: string[];

  @Column({ name: 'fecha_publicacion', type: 'date' })
  fechaPublicacion!: string;

  /** Baja lógica (RNF-07). */
  @Column({ default: true })
  activo!: boolean;

  @OneToMany(() => Ejemplar, (ejemplar) => ejemplar.obra)
  ejemplares?: Ejemplar[];

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn!: Date;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamptz' })
  actualizadoEn!: Date;
}
