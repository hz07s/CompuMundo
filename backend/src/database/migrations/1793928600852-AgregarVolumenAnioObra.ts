import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgregarVolumenAnioObra1793928600852 implements MigrationInterface {
  name = 'AgregarVolumenAnioObra1793928600852';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "obras" ADD "volumen" integer`);
    // Las obras ya registradas toman como año de edición el de su publicación.
    await queryRunner.query(`ALTER TABLE "obras" ADD "anio_edicion" smallint`);
    await queryRunner.query(
      `UPDATE "obras" SET "anio_edicion" = EXTRACT(YEAR FROM "fecha_publicacion")`,
    );
    await queryRunner.query(
      `ALTER TABLE "obras" ALTER COLUMN "anio_edicion" SET NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "obras" DROP COLUMN "anio_edicion"`);
    await queryRunner.query(`ALTER TABLE "obras" DROP COLUMN "volumen"`);
  }
}
