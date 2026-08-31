import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStudentCustomIndustry1788134400000 implements MigrationInterface {
  readonly name = 'AddStudentCustomIndustry1788134400000';
  readonly transaction = false;

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE
        other_industry_id integer;
      BEGIN
        IF EXISTS (
          SELECT 1 FROM public.industry WHERE is_custom_text = true
        ) THEN
          RETURN;
        END IF;

        SELECT industry_id
        INTO other_industry_id
        FROM public.industry
        WHERE lower(industry_name) = 'other'
        LIMIT 1;

        IF other_industry_id IS NULL THEN
          INSERT INTO public.industry (industry_name, is_custom_text)
          VALUES ('Other', true);
        ELSE
          UPDATE public.industry
          SET is_custom_text = true
          WHERE industry_id = other_industry_id;
        END IF;
      END
      $$;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM public.student_preferred_industry spi
          JOIN public.industry i ON i.industry_id = spi.industry_id
          WHERE i.is_custom_text = true
            AND lower(i.industry_name) = 'other'
        ) THEN
          RAISE EXCEPTION 'Cannot remove the custom industry while student preferences reference it';
        END IF;

        DELETE FROM public.industry
        WHERE is_custom_text = true
          AND lower(industry_name) = 'other';
      END
      $$;
    `);
  }
}
