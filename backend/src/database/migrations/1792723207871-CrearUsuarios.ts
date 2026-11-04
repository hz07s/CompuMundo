import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearUsuarios1792723207871 implements MigrationInterface {
  name = 'CrearUsuarios1792723207871';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."usuarios_rol_enum" AS ENUM('ADMINISTRADOR', 'BIBLIOTECARIO')`,
    );
    await queryRunner.query(
      `CREATE TABLE "usuarios" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "nombre_usuario" character varying(50) NOT NULL, "password_hash" character varying(60) NOT NULL, "rol" "public"."usuarios_rol_enum" NOT NULL, "activo" boolean NOT NULL DEFAULT true, "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "actualizado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_1a7a36f3dffef210b4c0ba5c6c0" UNIQUE ("nombre_usuario"), CONSTRAINT "PK_d7281c63c176e152e4c531594a8" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "usuarios"`);
    await queryRunner.query(`DROP TYPE "public"."usuarios_rol_enum"`);
  }
}
