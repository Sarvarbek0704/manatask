import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1781534273833 implements MigrationInterface {
    name = 'Migration1781534273833'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "work_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "workspaceId" uuid NOT NULL, "userId" uuid NOT NULL, "projectId" uuid, "taskId" uuid, "title" character varying NOT NULL, "body" text, "minutes" integer, "workedOn" date NOT NULL, CONSTRAINT "PK_f4f3234af57451baa20576887be" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f6be3128b0bc89d9a5ac0b9632" ON "work_logs" ("workspaceId", "userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_7b7311a11f046ac6e89ea18529" ON "work_logs" ("workspaceId", "workedOn") `);
        await queryRunner.query(`ALTER TYPE "public"."notifications_type_enum" RENAME TO "notifications_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."notifications_type_enum" AS ENUM('task_assigned', 'task_commented', 'task_status_changed', 'task_due_soon', 'mentioned', 'invited', 'worklog_posted')`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "public"."notifications_type_enum" USING "type"::"text"::"public"."notifications_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_type_enum_old"`);
        await queryRunner.query(`ALTER TABLE "work_logs" ADD CONSTRAINT "FK_a7cef7b1d5c9d145db7098ab4c7" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "work_logs" ADD CONSTRAINT "FK_699ea8c6b5b4acc9eebbdb9058d" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "work_logs" ADD CONSTRAINT "FK_e37d7d908506e4386389545375e" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "work_logs" DROP CONSTRAINT "FK_e37d7d908506e4386389545375e"`);
        await queryRunner.query(`ALTER TABLE "work_logs" DROP CONSTRAINT "FK_699ea8c6b5b4acc9eebbdb9058d"`);
        await queryRunner.query(`ALTER TABLE "work_logs" DROP CONSTRAINT "FK_a7cef7b1d5c9d145db7098ab4c7"`);
        await queryRunner.query(`CREATE TYPE "public"."notifications_type_enum_old" AS ENUM('task_assigned', 'task_commented', 'task_status_changed', 'task_due_soon', 'mentioned', 'invited')`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "public"."notifications_type_enum_old" USING "type"::"text"::"public"."notifications_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."notifications_type_enum_old" RENAME TO "notifications_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7b7311a11f046ac6e89ea18529"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f6be3128b0bc89d9a5ac0b9632"`);
        await queryRunner.query(`DROP TABLE "work_logs"`);
    }

}
