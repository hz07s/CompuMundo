import { Column, Entity, PrimaryColumn } from 'typeorm';

/** Último secuencial de código de ejemplar usado en cada año (se reinicia por año). */
@Entity('secuencias_codigo')
export class SecuenciaCodigo {
  @PrimaryColumn({ type: 'smallint' })
  anio!: number;

  @Column({ type: 'integer', default: 0 })
  ultimo!: number;
}
