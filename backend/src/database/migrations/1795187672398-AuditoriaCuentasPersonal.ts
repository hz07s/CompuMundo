import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuditoriaCuentasPersonal1795187672398 implements MigrationInterface {
  name = 'AuditoriaCuentasPersonal1795187672398';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "usuarios" ADD "creado_por" uuid`);
    await queryRunner.query(
      `ALTER TABLE "usuarios" ADD "actualizado_por" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios" ADD CONSTRAINT "FK_a880088b8ea53d7bc5ca7596cd6" FOREIGN KEY ("creado_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios" ADD CONSTRAINT "FK_a214314a893772c74173d82b6d2" FOREIGN KEY ("actualizado_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usuarios" DROP CONSTRAINT "FK_a214314a893772c74173d82b6d2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios" DROP CONSTRAINT "FK_a880088b8ea53d7bc5ca7596cd6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios" DROP COLUMN "actualizado_por"`,
    );
    await queryRunner.query(`ALTER TABLE "usuarios" DROP COLUMN "creado_por"`);
  }
}
