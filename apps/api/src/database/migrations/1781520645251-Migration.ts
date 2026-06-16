import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1781520645251 implements MigrationInterface {
    name = 'Migration1781520645251'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."api_keys_role_enum" AS ENUM('owner', 'admin', 'member', 'guest')`);
        await queryRunner.query(`CREATE TABLE "api_keys" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "workspaceId" uuid NOT NULL, "name" character varying NOT NULL, "keyPrefix" character varying NOT NULL, "keyHash" character varying NOT NULL, "role" "public"."api_keys_role_enum" NOT NULL DEFAULT 'member', "createdById" uuid NOT NULL, "lastUsedAt" TIMESTAMP WITH TIME ZONE, "revokedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_5c8a79801b44bd27b79228e1dad" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_df3b25181df0b4b59bd93f16e1" ON "api_keys" ("keyHash") `);
        await queryRunner.query(`CREATE INDEX "IDX_da0383f8ff714f82352b8f29bd" ON "api_keys" ("workspaceId") `);
        await queryRunner.query(`CREATE TABLE "webhooks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "workspaceId" uuid NOT NULL, "url" character varying NOT NULL, "events" jsonb NOT NULL DEFAULT '[]', "secret" character varying NOT NULL, "active" boolean NOT NULL DEFAULT true, "lastDeliveryAt" TIMESTAMP WITH TIME ZONE, "failureCount" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_9e8795cfc899ab7bdaa831e8527" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c7fbad6194e2e2ec9f2af1412a" ON "webhooks" ("workspaceId") `);
        await queryRunner.query(`ALTER TABLE "projects" ADD "deletedAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "deletedAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`CREATE INDEX "IDX_3a29952e0cacec410cbc93a248" ON "tasks" ("projectId", "sprintId") `);
        await queryRunner.query(`CREATE INDEX "IDX_c300d154a85801889174e92a3d" ON "tasks" ("dueDate") `);
        await queryRunner.query(`ALTER TABLE "api_keys" ADD CONSTRAINT "FK_da0383f8ff714f82352b8f29bd8" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "webhooks" ADD CONSTRAINT "FK_c7fbad6194e2e2ec9f2af1412a9" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "webhooks" DROP CONSTRAINT "FK_c7fbad6194e2e2ec9f2af1412a9"`);
        await queryRunner.query(`ALTER TABLE "api_keys" DROP CONSTRAINT "FK_da0383f8ff714f82352b8f29bd8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c300d154a85801889174e92a3d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3a29952e0cacec410cbc93a248"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "deletedAt"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c7fbad6194e2e2ec9f2af1412a"`);
        await queryRunner.query(`DROP TABLE "webhooks"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_da0383f8ff714f82352b8f29bd"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_df3b25181df0b4b59bd93f16e1"`);
        await queryRunner.query(`DROP TABLE "api_keys"`);
        await queryRunner.query(`DROP TYPE "public"."api_keys_role_enum"`);
    }

}
