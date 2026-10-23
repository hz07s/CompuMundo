import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearCatalogo1792724423257 implements MigrationInterface {
  name = 'CrearCatalogo1792724423257';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "obras" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "titulo" character varying(255) NOT NULL, "categoria" character varying(100) NOT NULL, "autores" text array NOT NULL, "fecha_publicacion" date NOT NULL, "activo" boolean NOT NULL DEFAULT true, "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "actualizado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1645460dfba8e8c144ecd8436da" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."ejemplares_estado_enum" AS ENUM('DISPONIBLE', 'PRESTADO')`,
    );
    await queryRunner.query(
      `CREATE TABLE "ejemplares" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "obra_id" uuid NOT NULL, "codigo" character varying(20) NOT NULL, "estado" "public"."ejemplares_estado_enum" NOT NULL DEFAULT 'DISPONIBLE', "activo" boolean NOT NULL DEFAULT true, "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "actualizado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_8131104db8dc6a544a86d4c7895" UNIQUE ("codigo"), CONSTRAINT "PK_838ba901fb197e284c6baf36702" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3a645c71752c9b375b78720259" ON "ejemplares"  ("obra_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "secuencias_codigo" ("anio" smallint NOT NULL, "ultimo" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_d9d7a6753a75c45628d15c8780e" PRIMARY KEY ("anio"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "ejemplares" ADD CONSTRAINT "FK_3a645c71752c9b375b787202593" FOREIGN KEY ("obra_id") REFERENCES "obras"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ejemplares" DROP CONSTRAINT "FK_3a645c71752c9b375b787202593"`,
    );
    await queryRunner.query(`DROP TABLE "secuencias_codigo"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3a645c71752c9b375b78720259"`,
    );
    await queryRunner.query(`DROP TABLE "ejemplares"`);
    await queryRunner.query(`DROP TYPE "public"."ejemplares_estado_enum"`);
    await queryRunner.query(`DROP TABLE "obras"`);
  }
}
