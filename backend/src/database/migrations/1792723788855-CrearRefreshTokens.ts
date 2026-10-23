import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearRefreshTokens1792723788855 implements MigrationInterface {
  name = 'CrearRefreshTokens1792723788855';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "refresh_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "usuario_id" uuid NOT NULL, "token_hash" character varying(64) NOT NULL, "expira_en" TIMESTAMP WITH TIME ZONE NOT NULL, "revocado_en" TIMESTAMP WITH TIME ZONE, "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_a7838d2ba25be1342091b6695f1" UNIQUE ("token_hash"), CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c8349fdadc1bc791125bdd8c85" ON "refresh_tokens"  ("usuario_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_c8349fdadc1bc791125bdd8c855" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_c8349fdadc1bc791125bdd8c855"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c8349fdadc1bc791125bdd8c85"`,
    );
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
  }
}
