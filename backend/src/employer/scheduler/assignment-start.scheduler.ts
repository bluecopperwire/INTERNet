import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource } from 'typeorm';
import { withStatusActor } from '../../database/status-actor.transaction';
import { currentManilaDate, MANILA_TIME_ZONE } from '../utils/time.utils';

@Injectable()
export class AssignmentStartScheduler implements OnModuleInit {
  private readonly logger = new Logger(AssignmentStartScheduler.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.transitionDueAssignments();
    } catch (error) {
      this.logger.error('Assignment startup catch-up failed.', error);
    }
  }

  @Cron('0 0 * * *', {
    name: 'employer-assignment-start',
    timeZone: MANILA_TIME_ZONE,
  })
  async transitionDueAssignments(): Promise<number> {
    const today = currentManilaDate();
    const due: Array<{ internship_assignment_id: number }> =
      await this.dataSource.query(
        `
          SELECT internship_assignment_id
          FROM public.internship_assignment
          WHERE assignment_status = 'pending' AND start_date <= $1::date
            AND deleted_at IS NULL
          ORDER BY internship_assignment_id
        `,
        [today],
      );
    let transitioned = 0;
    for (const item of due) {
      const assignmentId = Number(item.internship_assignment_id);
      try {
        const changed = await withStatusActor(
          this.dataSource,
          null,
          async (runner) => {
            const result = await runner.query(
              `
                  UPDATE public.internship_assignment
                  SET assignment_status = 'ongoing'
                  WHERE internship_assignment_id = $1
                    AND assignment_status = 'pending'
                    AND start_date <= $2::date
                    AND deleted_at IS NULL
                  RETURNING internship_assignment_id
                `,
              [assignmentId, today],
              true,
            );
            return result.records.length === 1;
          },
        );
        if (changed) transitioned += 1;
      } catch (error) {
        this.logger.error(
          `Could not start due internship assignment ${assignmentId}.`,
          error,
        );
      }
    }
    return transitioned;
  }
}
