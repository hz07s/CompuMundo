import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearPrestamos1793935828401 implements MigrationInterface {
  name = 'CrearPrestamos1793935828401';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."prestamos_estado_enum" AS ENUM('VIGENTE', 'VENCIDO', 'DEVUELTO')`,
    );
    await queryRunner.query(
      `CREATE TABLE "prestamos" ("creado_por" uuid, "actualizado_por" uuid, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "lector_id" uuid NOT NULL, "ejemplar_id" uuid NOT NULL, "fecha_prestamo" date NOT NULL, "fecha_devolucion" date NOT NULL, "fecha_devuelto" date, "estado" "public"."prestamos_estado_enum" NOT NULL DEFAULT 'VIGENTE', "justificacion" text, "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "actualizado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_3a2a5a8ed68438a02780b16c5b4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3d15a20e168688e5909aa1356f" ON "prestamos"  ("lector_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3b267e541fe79af208a107f4ae" ON "prestamos"  ("ejemplar_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0b0346a5d3d6b8aba29b349816" ON "prestamos"  ("estado") `,
    );
    await queryRunner.query(
      `ALTER TABLE "prestamos" ADD CONSTRAINT "FK_2eba4a6fedb2777c7a718146e62" FOREIGN KEY ("creado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "prestamos" ADD CONSTRAINT "FK_682f54af7281377599672f92111" FOREIGN KEY ("actualizado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "prestamos" ADD CONSTRAINT "FK_3d15a20e168688e5909aa1356f3" FOREIGN KEY ("lector_id") REFERENCES "lectores"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "prestamos" ADD CONSTRAINT "FK_3b267e541fe79af208a107f4ae9" FOREIGN KEY ("ejemplar_id") REFERENCES "ejemplares"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "prestamos" DROP CONSTRAINT "FK_3b267e541fe79af208a107f4ae9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "prestamos" DROP CONSTRAINT "FK_3d15a20e168688e5909aa1356f3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "prestamos" DROP CONSTRAINT "FK_682f54af7281377599672f92111"`,
    );
    await queryRunner.query(
      `ALTER TABLE "prestamos" DROP CONSTRAINT "FK_2eba4a6fedb2777c7a718146e62"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0b0346a5d3d6b8aba29b349816"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3b267e541fe79af208a107f4ae"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3d15a20e168688e5909aa1356f"`,
    );
    await queryRunner.query(`DROP TABLE "prestamos"`);
    await queryRunner.query(`DROP TYPE "public"."prestamos_estado_enum"`);
  }
}
