import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1781761201517 implements MigrationInterface {
    name = 'Migration1781761201517'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "teams" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "workspaceId" uuid NOT NULL, "name" character varying NOT NULL, "color" character varying NOT NULL DEFAULT '#138067', CONSTRAINT "PK_7e5523774a38b08a6236d322403" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3ca5ec3f5558bcfb54c76a1ef2" ON "teams" ("workspaceId") `);
        await queryRunner.query(`CREATE TABLE "team_members" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "teamId" uuid NOT NULL, "userId" uuid NOT NULL, CONSTRAINT "UQ_b2f17b533905e0a94390c5e2208" UNIQUE ("teamId", "userId"), CONSTRAINT "PK_ca3eae89dcf20c9fd95bf7460aa" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0a72b849753a046462b4c5a8ec" ON "team_members" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_6d1c8c7f705803f0711336a5c3" ON "team_members" ("teamId") `);
        await queryRunner.query(`ALTER TABLE "workspaces" ADD "githubSecret" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD "calendarToken" character varying`);
        await queryRunner.query(`ALTER TABLE "teams" ADD CONSTRAINT "FK_3ca5ec3f5558bcfb54c76a1ef23" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "team_members" ADD CONSTRAINT "FK_6d1c8c7f705803f0711336a5c33" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "team_members" ADD CONSTRAINT "FK_0a72b849753a046462b4c5a8ec2" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "team_members" DROP CONSTRAINT "FK_0a72b849753a046462b4c5a8ec2"`);
        await queryRunner.query(`ALTER TABLE "team_members" DROP CONSTRAINT "FK_6d1c8c7f705803f0711336a5c33"`);
        await queryRunner.query(`ALTER TABLE "teams" DROP CONSTRAINT "FK_3ca5ec3f5558bcfb54c76a1ef23"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "calendarToken"`);
        await queryRunner.query(`ALTER TABLE "workspaces" DROP COLUMN "githubSecret"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6d1c8c7f705803f0711336a5c3"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0a72b849753a046462b4c5a8ec"`);
        await queryRunner.query(`DROP TABLE "team_members"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3ca5ec3f5558bcfb54c76a1ef2"`);
        await queryRunner.query(`DROP TABLE "teams"`);
    }

}
