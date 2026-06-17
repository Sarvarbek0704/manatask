import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1781696720006 implements MigrationInterface {
    name = 'Migration1781696720006'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "challenges" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "workspaceId" uuid NOT NULL, "title" character varying NOT NULL DEFAULT '100-Day Challenge', "startDate" date NOT NULL, "endDate" date NOT NULL, "target" integer NOT NULL DEFAULT '100', "active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_1e664e93171e20fe4d6125466af" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3f4bd372eb65915959e26bd6a8" ON "challenges" ("workspaceId") `);
        await queryRunner.query(`CREATE TYPE "public"."work_logs_status_enum" AS ENUM('pending', 'accepted', 'rejected')`);
        await queryRunner.query(`ALTER TABLE "work_logs" ADD "status" "public"."work_logs_status_enum" NOT NULL DEFAULT 'pending'`);
        await queryRunner.query(`ALTER TABLE "work_logs" ADD "reviewedById" uuid`);
        await queryRunner.query(`ALTER TABLE "work_logs" ADD "reviewedAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TYPE "public"."notifications_type_enum" RENAME TO "notifications_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."notifications_type_enum" AS ENUM('task_assigned', 'task_commented', 'task_status_changed', 'task_due_soon', 'mentioned', 'invited', 'worklog_posted', 'worklog_reviewed')`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "public"."notifications_type_enum" USING "type"::"text"::"public"."notifications_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_type_enum_old"`);
        await queryRunner.query(`ALTER TABLE "work_logs" ADD CONSTRAINT "FK_c09719c204e7a0e367a40ca8b3f" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "challenges" ADD CONSTRAINT "FK_3f4bd372eb65915959e26bd6a81" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "challenges" DROP CONSTRAINT "FK_3f4bd372eb65915959e26bd6a81"`);
        await queryRunner.query(`ALTER TABLE "work_logs" DROP CONSTRAINT "FK_c09719c204e7a0e367a40ca8b3f"`);
        await queryRunner.query(`CREATE TYPE "public"."notifications_type_enum_old" AS ENUM('task_assigned', 'task_commented', 'task_status_changed', 'task_due_soon', 'mentioned', 'invited', 'worklog_posted')`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "public"."notifications_type_enum_old" USING "type"::"text"::"public"."notifications_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."notifications_type_enum_old" RENAME TO "notifications_type_enum"`);
        await queryRunner.query(`ALTER TABLE "work_logs" DROP COLUMN "reviewedAt"`);
        await queryRunner.query(`ALTER TABLE "work_logs" DROP COLUMN "reviewedById"`);
        await queryRunner.query(`ALTER TABLE "work_logs" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."work_logs_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3f4bd372eb65915959e26bd6a8"`);
        await queryRunner.query(`DROP TABLE "challenges"`);
    }

}
