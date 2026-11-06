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
import { Ejemplar } from '../../catalogo/entities/ejemplar.entity';
import { EntidadAuditada } from '../../common/entities/auditoria.entity';
import { Lector } from '../../lectores/entities/lector.entity';

/**
 * Estados del préstamo (RN-05): Vigente → Devuelto, Vigente → Vencido
 * (proceso diario, RN-06) y Vencido → Devuelto. Devuelto es final.
 */
export enum EstadoPrestamo {
  VIGENTE = 'VIGENTE',
  VENCIDO = 'VENCIDO',
  DEVUELTO = 'DEVUELTO',
}

/** Estados en los que el lector sigue teniendo el ejemplar (RN-08). */
export const ESTADOS_ACTIVOS: EstadoPrestamo[] = [
  EstadoPrestamo.VIGENTE,
  EstadoPrestamo.VENCIDO,
];

/** Nombre del índice que garantiza RN-08 en la base de datos. */
export const INDICE_PRESTAMO_ACTIVO_POR_LECTOR = 'UQ_prestamos_lector_activo';

/**
 * RN-08: máximo un préstamo Vigente o Vencido por lector. Además de validarse en
 * el servicio, lo garantiza la base de datos (índice único parcial), de modo que
 * dos registros simultáneos no puedan dejar a un lector con dos préstamos activos.
 */
@Index(INDICE_PRESTAMO_ACTIVO_POR_LECTOR, ['lectorId'], {
  unique: true,
  where: `"estado" IN ('VIGENTE', 'VENCIDO')`,
})
/** Préstamo de un ejemplar a un lector (HU-004). */
@Entity('prestamos')
export class Prestamo extends EntidadAuditada {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'lector_id', type: 'uuid' })
  lectorId!: string;

  @ManyToOne(() => Lector, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'lector_id' })
  lector?: Lector;

  @Index()
  @Column({ name: 'ejemplar_id', type: 'uuid' })
  ejemplarId!: string;

  @ManyToOne(() => Ejemplar, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ejemplar_id' })
  ejemplar?: Ejemplar;

  /** Día calendario del préstamo (Lima), AAAA-MM-DD. */
  @Column({ name: 'fecha_prestamo', type: 'date' })
  fechaPrestamo!: string;

  /** Fecha de préstamo + 3 días hábiles (RN-01), AAAA-MM-DD. */
  @Column({ name: 'fecha_devolucion', type: 'date' })
  fechaDevolucion!: string;

  /** Día en que se devolvió el ejemplar; nulo mientras siga activo. */
  @Column({ name: 'fecha_devuelto', type: 'date', nullable: true })
  fechaDevuelto!: string | null;

  @Index()
  @Column({
    type: 'enum',
    enum: EstadoPrestamo,
    default: EstadoPrestamo.VIGENTE,
  })
  estado!: EstadoPrestamo;

  /** Justificación escrita del Bibliotecario ante la advertencia de morosidad (RN-02). */
  @Column({ type: 'text', nullable: true })
  justificacion!: string | null;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn!: Date;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamptz' })
  actualizadoEn!: Date;
}
