import { MigrationInterface, QueryRunner } from 'typeorm';

export class IndiceUnicoPrestamoActivo1793936265095 implements MigrationInterface {
  name = 'IndiceUnicoPrestamoActivo1793936265095';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_prestamos_lector_activo" ON "prestamos"  ("lector_id") WHERE "estado" IN ('VIGENTE', 'VENCIDO')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_prestamos_lector_activo"`);
  }
}
