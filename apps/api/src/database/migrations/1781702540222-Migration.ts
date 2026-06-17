import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1781702540222 implements MigrationInterface {
    name = 'Migration1781702540222'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "work_logs" ADD "reviewNote" text`);
        // Convert the enum column to varchar in place (preserve existing data).
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "type" TYPE character varying USING "type"::text`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."notifications_type_enum"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "type"`);
        await queryRunner.query(`CREATE TYPE "public"."notifications_type_enum" AS ENUM('task_assigned', 'task_commented', 'task_status_changed', 'task_due_soon', 'mentioned', 'invited', 'worklog_posted', 'worklog_reviewed')`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD "type" "public"."notifications_type_enum" NOT NULL`);
        await queryRunner.query(`ALTER TABLE "work_logs" DROP COLUMN "reviewNote"`);
    }

}
