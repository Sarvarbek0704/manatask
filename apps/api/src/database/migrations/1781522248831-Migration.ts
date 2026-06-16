import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1781522248831 implements MigrationInterface {
    name = 'Migration1781522248831'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add with a default so existing rows backfill, then drop the default
        // (the @VersionColumn manages the value going forward).
        await queryRunner.query(`ALTER TABLE "tasks" ADD "version" integer NOT NULL DEFAULT 1`);
        await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "version" DROP DEFAULT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "version"`);
    }

}
