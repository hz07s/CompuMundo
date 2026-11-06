import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearLectores1793935029330 implements MigrationInterface {
  name = 'CrearLectores1793935029330';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "lectores" ("creado_por" uuid, "actualizado_por" uuid, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "dni" character(8) NOT NULL, "nombres" character varying(100) NOT NULL, "apellidos" character varying(100) NOT NULL, "categoria" character varying(30) NOT NULL, "fecha_nacimiento" date NOT NULL, "apoderado_dni" character(8), "apoderado_nombre" character varying(200), "consentimiento_apoderado" boolean NOT NULL DEFAULT false, "activo" boolean NOT NULL DEFAULT true, "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "actualizado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_4879d8231e6cc9f07bc64cec852" UNIQUE ("dni"), CONSTRAINT "PK_0f18fb80b2c580ac03184f1b1f8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "lectores" ADD CONSTRAINT "FK_c62918365328fb8861c1476e23d" FOREIGN KEY ("creado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lectores" ADD CONSTRAINT "FK_4c776f9151ab3dcc5323ffde1a9" FOREIGN KEY ("actualizado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "lectores" DROP CONSTRAINT "FK_4c776f9151ab3dcc5323ffde1a9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lectores" DROP CONSTRAINT "FK_c62918365328fb8861c1476e23d"`,
    );
    await queryRunner.query(`DROP TABLE "lectores"`);
  }
}
