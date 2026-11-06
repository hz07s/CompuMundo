import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearDesbloqueosLector1793938891789 implements MigrationInterface {
  name = 'CrearDesbloqueosLector1793938891789';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "desbloqueos_lector" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "lector_id" uuid NOT NULL, "motivo" text NOT NULL, "desbloqueado_por" uuid NOT NULL, "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_f73c871ebe4a9523b7e837f5bdb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f5fe40a7fe1463e468e3872bf2" ON "desbloqueos_lector"  ("lector_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "desbloqueos_lector" ADD CONSTRAINT "FK_f5fe40a7fe1463e468e3872bf21" FOREIGN KEY ("lector_id") REFERENCES "lectores"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "desbloqueos_lector" ADD CONSTRAINT "FK_a2281bbe1a39f3573cac2d8ae7d" FOREIGN KEY ("desbloqueado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "desbloqueos_lector" DROP CONSTRAINT "FK_a2281bbe1a39f3573cac2d8ae7d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "desbloqueos_lector" DROP CONSTRAINT "FK_f5fe40a7fe1463e468e3872bf21"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f5fe40a7fe1463e468e3872bf2"`,
    );
    await queryRunner.query(`DROP TABLE "desbloqueos_lector"`);
  }
}
