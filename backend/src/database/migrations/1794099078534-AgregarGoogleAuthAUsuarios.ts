import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgregarGoogleAuthAUsuarios1794099078534 implements MigrationInterface {
  name = 'AgregarGoogleAuthAUsuarios1794099078534';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usuarios" ADD "email" character varying(120)`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios" ADD CONSTRAINT "UQ_446adfc18b35418aac32ae0b7b5" UNIQUE ("email")`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios" ADD "google_id" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios" ADD CONSTRAINT "UQ_7297e3daa75b842415eddc76cc5" UNIQUE ("google_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios" ALTER COLUMN "password_hash" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usuarios" ALTER COLUMN "password_hash" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios" DROP CONSTRAINT "UQ_7297e3daa75b842415eddc76cc5"`,
    );
    await queryRunner.query(`ALTER TABLE "usuarios" DROP COLUMN "google_id"`);
    await queryRunner.query(
      `ALTER TABLE "usuarios" DROP CONSTRAINT "UQ_446adfc18b35418aac32ae0b7b5"`,
    );
    await queryRunner.query(`ALTER TABLE "usuarios" DROP COLUMN "email"`);
  }
}
