import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntidadAuditada } from '../../common/entities/auditoria.entity';

/** Categorías de lector (RF-07). Valores por confirmar con el bibliotecario. */
export enum CategoriaLector {
  ESTUDIANTE = 'ESTUDIANTE',
  DOCENTE = 'DOCENTE',
  ADMINISTRATIVO = 'ADMINISTRATIVO',
}

/** Mayoría de edad que activa los datos del apoderado (RN-09). */
export const EDAD_MAYORIA = 18;

/** Persona que toma prestado material del CEDIS. */
@Entity('lectores')
export class Lector extends EntidadAuditada {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** DNI completo: solo se expone enmascarado, salvo en la verificación presencial (RNF-02). */
  @Column({ type: 'char', length: 8, unique: true })
  dni!: string;

  @Column({ length: 100 })
  nombres!: string;

  @Column({ length: 100 })
  apellidos!: string;

  @Column({ type: 'varchar', length: 30 })
  categoria!: CategoriaLector;

  /** Determina la minoría de edad (RN-09, propuesta P-23). */
  @Column({ name: 'fecha_nacimiento', type: 'date' })
  fechaNacimiento!: string;

  @Column({ name: 'apoderado_dni', type: 'char', length: 8, nullable: true })
  apoderadoDni!: string | null;

  @Column({
    name: 'apoderado_nombre',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  apoderadoNombre!: string | null;

  /** Consentimiento firmado recibido (Ley 29733). */
  @Column({ name: 'consentimiento_apoderado', default: false })
  consentimientoApoderado!: boolean;

  /** Baja lógica (RNF-07). */
  @Column({ default: true })
  activo!: boolean;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn!: Date;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamptz' })
  actualizadoEn!: Date;
}
