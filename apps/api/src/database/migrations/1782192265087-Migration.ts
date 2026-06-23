import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1782192265087 implements MigrationInterface {
    name = 'Migration1782192265087'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tasks" ADD "archivedAt" TIMESTAMP WITH TIME ZONE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "archivedAt"`);
    }

}
