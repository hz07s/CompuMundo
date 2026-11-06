import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgregarUsuarioResponsableCatalogo1793934180070 implements MigrationInterface {
  name = 'AgregarUsuarioResponsableCatalogo1793934180070';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "obras" ADD "creado_por" uuid`);
    await queryRunner.query(`ALTER TABLE "obras" ADD "actualizado_por" uuid`);
    await queryRunner.query(`ALTER TABLE "ejemplares" ADD "creado_por" uuid`);
    await queryRunner.query(
      `ALTER TABLE "ejemplares" ADD "actualizado_por" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "obras" ADD CONSTRAINT "FK_10537b99248dea56b42c9b88419" FOREIGN KEY ("creado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "obras" ADD CONSTRAINT "FK_4f4ebfe5cc0af0d044ba6ab3434" FOREIGN KEY ("actualizado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ejemplares" ADD CONSTRAINT "FK_f971e43ad7302eea8ec8bc08c9f" FOREIGN KEY ("creado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ejemplares" ADD CONSTRAINT "FK_9459099298e206bbed9dbba11ab" FOREIGN KEY ("actualizado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ejemplares" DROP CONSTRAINT "FK_9459099298e206bbed9dbba11ab"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ejemplares" DROP CONSTRAINT "FK_f971e43ad7302eea8ec8bc08c9f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "obras" DROP CONSTRAINT "FK_4f4ebfe5cc0af0d044ba6ab3434"`,
    );
    await queryRunner.query(
      `ALTER TABLE "obras" DROP CONSTRAINT "FK_10537b99248dea56b42c9b88419"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ejemplares" DROP COLUMN "actualizado_por"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ejemplares" DROP COLUMN "creado_por"`,
    );
    await queryRunner.query(
      `ALTER TABLE "obras" DROP COLUMN "actualizado_por"`,
    );
    await queryRunner.query(`ALTER TABLE "obras" DROP COLUMN "creado_por"`);
  }
}
