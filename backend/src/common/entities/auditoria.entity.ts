import { Column, JoinColumn, ManyToOne } from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';

/**
 * Usuario responsable de crear y de modificar un registro (RF-16, DoD-7).
 * Las entidades de negocio la extienden; las fechas ya las llevan
 * `creadoEn` y `actualizadoEn`. Es nulo solo en registros anteriores a ST-18.
 */
export abstract class EntidadAuditada {
  @Column({ name: 'creado_por', type: 'uuid', nullable: true })
  creadoPor!: string | null;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'creado_por' })
  creador?: Usuario | null;

  @Column({ name: 'actualizado_por', type: 'uuid', nullable: true })
  actualizadoPor!: string | null;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'actualizado_por' })
  actualizador?: Usuario | null;
}
