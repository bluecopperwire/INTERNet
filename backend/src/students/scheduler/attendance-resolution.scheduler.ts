import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource } from 'typeorm';
import {
  currentManilaDate,
  currentManilaMinutes,
  MANILA_TIME_ZONE,
} from '../../employer/utils/time.utils';

@Injectable()
export class AttendanceResolutionScheduler implements OnModuleInit {
  private readonly logger = new Logger(AttendanceResolutionScheduler.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    await this.resolveSafely('startup');
  }

  // Every minute resolves shifts no more than 59 seconds after their end.
  @Cron('0 * * * * *', {
    name: 'student-attendance-resolution',
    timeZone: MANILA_TIME_ZONE,
  })
  async resolveAttendance(now = new Date()): Promise<{
    absent: number;
    incomplete: number;
  }> {
    const today = currentManilaDate(now);
    const nowMinutes = Math.floor(currentManilaMinutes(now));
    const incomplete = await this.markPreviousOpenRowsIncomplete(today);
    const absent = await this.createDueAbsences(today, nowMinutes);
    return { absent, incomplete };
  }

  async markPreviousOpenRowsIncomplete(today: string): Promise<number> {
    const rows = await this.dataSource.query(
      `UPDATE public.attendance_record
       SET attendance_status = 'incomplete', rendered_minutes = 0
       WHERE attendance_date < $1::date
         AND attendance_status = 'present'
         AND time_in IS NOT NULL AND time_out IS NULL
       RETURNING attendance_record_id`,
      [today],
    );
    return rows.length;
  }

  async createDueAbsences(today: string, nowMinutes: number): Promise<number> {
    const rows = await this.dataSource.query(
      `INSERT INTO public.attendance_record (
         internship_assignment_id, attendance_date, attendance_status,
         time_in, time_out, rendered_minutes
       )
       SELECT ia.internship_assignment_id, $1::date, 'absent', NULL, NULL, 0
       FROM public.internship_assignment ia
       WHERE ia.assignment_status = 'ongoing'
         AND ia.deleted_at IS NULL
         AND ia.ended_at IS NULL
         AND ia.start_date <= $1::date
         AND extract(dow FROM $1::date)::integer = ANY(ia.working_days)
         AND (extract(hour FROM ia.end_shift)::integer * 60
              + extract(minute FROM ia.end_shift)::integer) <= $2
         AND NOT EXISTS (
           SELECT 1 FROM public.attendance_record ar
           WHERE ar.internship_assignment_id = ia.internship_assignment_id
             AND ar.attendance_date = $1::date
         )
       ON CONFLICT (internship_assignment_id, attendance_date) DO NOTHING
       RETURNING attendance_record_id`,
      [today, nowMinutes],
    );
    return rows.length;
  }

  private async resolveSafely(source: string): Promise<void> {
    try {
      await this.resolveAttendance();
    } catch (error) {
      this.logger.error(`Attendance ${source} resolution failed.`, error);
    }
  }
}
