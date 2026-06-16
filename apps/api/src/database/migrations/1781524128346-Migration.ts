import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1781524128346 implements MigrationInterface {
    name = 'Migration1781524128346'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "task_watchers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "taskId" uuid NOT NULL, "userId" uuid NOT NULL, CONSTRAINT "UQ_b0e6668f13458f5ac5868474ef9" UNIQUE ("taskId", "userId"), CONSTRAINT "PK_fa77927e9a914d3ed0b6726a6e2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_33f8c5658e46a50aae0ce4c781" ON "task_watchers" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_905afe60aaeffdf040ba5b6f26" ON "task_watchers" ("taskId") `);
        await queryRunner.query(`CREATE TYPE "public"."custom_field_definitions_type_enum" AS ENUM('text', 'number', 'date', 'select', 'checkbox', 'url')`);
        await queryRunner.query(`CREATE TABLE "custom_field_definitions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "projectId" uuid NOT NULL, "name" character varying NOT NULL, "type" "public"."custom_field_definitions_type_enum" NOT NULL DEFAULT 'text', "options" jsonb NOT NULL DEFAULT '[]', "order" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_91f4cf6416f7aeb02c217005cb2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f11cb6c3a74b7051c520483ebb" ON "custom_field_definitions" ("projectId") `);
        await queryRunner.query(`CREATE TYPE "public"."saved_views_viewtype_enum" AS ENUM('kanban', 'list', 'calendar')`);
        await queryRunner.query(`CREATE TABLE "saved_views" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "workspaceId" uuid NOT NULL, "projectId" uuid, "ownerId" uuid NOT NULL, "name" character varying NOT NULL, "viewType" "public"."saved_views_viewtype_enum" NOT NULL DEFAULT 'kanban', "config" jsonb NOT NULL DEFAULT '{}', "shared" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_30acd4fbe2058d97631ab9bb2b6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c0f0d3f489621a016ee658574e" ON "saved_views" ("workspaceId") `);
        await queryRunner.query(`CREATE TABLE "task_templates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "projectId" uuid NOT NULL, "name" character varying NOT NULL, "payload" jsonb NOT NULL DEFAULT '{}', CONSTRAINT "PK_a1347b5446b9e3158e2b72f58b2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_da108c7221ab998b96b0d51760" ON "task_templates" ("projectId") `);
        await queryRunner.query(`CREATE TYPE "public"."recurring_tasks_frequency_enum" AS ENUM('daily', 'weekly', 'monthly')`);
        await queryRunner.query(`CREATE TABLE "recurring_tasks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "projectId" uuid NOT NULL, "workspaceId" uuid NOT NULL, "frequency" "public"."recurring_tasks_frequency_enum" NOT NULL, "interval" integer NOT NULL DEFAULT '1', "payload" jsonb NOT NULL DEFAULT '{}', "nextRunAt" TIMESTAMP WITH TIME ZONE NOT NULL, "active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_9a998c7a4854b2789d988bc9750" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_4d3f6d34107423cd34855c7aff" ON "recurring_tasks" ("nextRunAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_683185ab062e1a8b50ffe40290" ON "recurring_tasks" ("projectId") `);
        await queryRunner.query(`CREATE TABLE "automation_rules" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "projectId" uuid NOT NULL, "workspaceId" uuid NOT NULL, "name" character varying NOT NULL, "trigger" jsonb NOT NULL, "actions" jsonb NOT NULL DEFAULT '[]', "active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_378bed501eacc036895837121c2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_cd70e7d3ae937aa10844c4f767" ON "automation_rules" ("projectId") `);
        await queryRunner.query(`CREATE TABLE "public_shares" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "workspaceId" uuid NOT NULL, "resourceType" character varying NOT NULL, "resourceId" uuid NOT NULL, "token" character varying NOT NULL, "createdById" uuid NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_3e48562ef815b9131c82faee82c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_952326f13253dcd2db61bf48f1" ON "public_shares" ("token") `);
        await queryRunner.query(`CREATE TABLE "task_assignees" ("tasksId" uuid NOT NULL, "usersId" uuid NOT NULL, CONSTRAINT "PK_71259eff171eb323f416cd3b74d" PRIMARY KEY ("tasksId", "usersId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_836169568c5c001ee34e7aa78f" ON "task_assignees" ("tasksId") `);
        await queryRunner.query(`CREATE INDEX "IDX_e54b42e47461564bc4b18b8f93" ON "task_assignees" ("usersId") `);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "customFields" jsonb`);
        await queryRunner.query(`ALTER TABLE "task_watchers" ADD CONSTRAINT "FK_905afe60aaeffdf040ba5b6f261" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_watchers" ADD CONSTRAINT "FK_33f8c5658e46a50aae0ce4c7816" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "custom_field_definitions" ADD CONSTRAINT "FK_f11cb6c3a74b7051c520483ebb8" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "saved_views" ADD CONSTRAINT "FK_c0f0d3f489621a016ee658574e9" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_templates" ADD CONSTRAINT "FK_da108c7221ab998b96b0d51760c" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "recurring_tasks" ADD CONSTRAINT "FK_683185ab062e1a8b50ffe402908" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "automation_rules" ADD CONSTRAINT "FK_cd70e7d3ae937aa10844c4f7672" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "public_shares" ADD CONSTRAINT "FK_44146a7771468c1f78a72b63296" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_assignees" ADD CONSTRAINT "FK_836169568c5c001ee34e7aa78f7" FOREIGN KEY ("tasksId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "task_assignees" ADD CONSTRAINT "FK_e54b42e47461564bc4b18b8f933" FOREIGN KEY ("usersId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task_assignees" DROP CONSTRAINT "FK_e54b42e47461564bc4b18b8f933"`);
        await queryRunner.query(`ALTER TABLE "task_assignees" DROP CONSTRAINT "FK_836169568c5c001ee34e7aa78f7"`);
        await queryRunner.query(`ALTER TABLE "public_shares" DROP CONSTRAINT "FK_44146a7771468c1f78a72b63296"`);
        await queryRunner.query(`ALTER TABLE "automation_rules" DROP CONSTRAINT "FK_cd70e7d3ae937aa10844c4f7672"`);
        await queryRunner.query(`ALTER TABLE "recurring_tasks" DROP CONSTRAINT "FK_683185ab062e1a8b50ffe402908"`);
        await queryRunner.query(`ALTER TABLE "task_templates" DROP CONSTRAINT "FK_da108c7221ab998b96b0d51760c"`);
        await queryRunner.query(`ALTER TABLE "saved_views" DROP CONSTRAINT "FK_c0f0d3f489621a016ee658574e9"`);
        await queryRunner.query(`ALTER TABLE "custom_field_definitions" DROP CONSTRAINT "FK_f11cb6c3a74b7051c520483ebb8"`);
        await queryRunner.query(`ALTER TABLE "task_watchers" DROP CONSTRAINT "FK_33f8c5658e46a50aae0ce4c7816"`);
        await queryRunner.query(`ALTER TABLE "task_watchers" DROP CONSTRAINT "FK_905afe60aaeffdf040ba5b6f261"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "customFields"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e54b42e47461564bc4b18b8f93"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_836169568c5c001ee34e7aa78f"`);
        await queryRunner.query(`DROP TABLE "task_assignees"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_952326f13253dcd2db61bf48f1"`);
        await queryRunner.query(`DROP TABLE "public_shares"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cd70e7d3ae937aa10844c4f767"`);
        await queryRunner.query(`DROP TABLE "automation_rules"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_683185ab062e1a8b50ffe40290"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4d3f6d34107423cd34855c7aff"`);
        await queryRunner.query(`DROP TABLE "recurring_tasks"`);
        await queryRunner.query(`DROP TYPE "public"."recurring_tasks_frequency_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_da108c7221ab998b96b0d51760"`);
        await queryRunner.query(`DROP TABLE "task_templates"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c0f0d3f489621a016ee658574e"`);
        await queryRunner.query(`DROP TABLE "saved_views"`);
        await queryRunner.query(`DROP TYPE "public"."saved_views_viewtype_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f11cb6c3a74b7051c520483ebb"`);
        await queryRunner.query(`DROP TABLE "custom_field_definitions"`);
        await queryRunner.query(`DROP TYPE "public"."custom_field_definitions_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_905afe60aaeffdf040ba5b6f26"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_33f8c5658e46a50aae0ce4c781"`);
        await queryRunner.query(`DROP TABLE "task_watchers"`);
    }

}
