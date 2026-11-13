import { MigrationInterface, QueryRunner } from "typeorm";

export class AgregarCorreoUsuario1794095355440 implements MigrationInterface {
    name = 'AgregarCorreoUsuario1794095355440'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "usuarios" ADD "email" character varying`);
        await queryRunner.query(`ALTER TABLE "usuarios" ADD CONSTRAINT "UQ_446adfc18b35418aac32ae0b7b5" UNIQUE ("email")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "usuarios" DROP CONSTRAINT "UQ_446adfc18b35418aac32ae0b7b5"`);
        await queryRunner.query(`ALTER TABLE "usuarios" DROP COLUMN "email"`);
    }

}
