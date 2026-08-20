import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
  Logger,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Student } from './students.entity';
import { StudentProfileUpdateDto, StudentRequirementUploadDto } from './students.dto';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async findById(id: number): Promise<Student | null> {
    return this.studentRepo.findOne({ where: { studentId: id } });
  }

  // Reads the student plus the joined academic, preference, and preferred-industry records.
  async getStudentProfile(studentId: number) {
    const [student] = await this.dataSource.query(
      `
        SELECT s.*
        FROM public.student s
        WHERE s.student_id = $1
      `,
      [studentId],
    );

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const [academic] = await this.dataSource.query(
      `
        SELECT sai.*
        FROM public.student_academic_information sai
        WHERE sai.student_id = $1
      `,
      [studentId],
    );

    const [preference] = await this.dataSource.query(
      `
        SELECT ip.*
        FROM public.internship_preference ip
        WHERE ip.student_id = $1
      `,
      [studentId],
    );

    const preferredIndustries = await this.dataSource.query(
      `
        SELECT spi.student_id, spi.industry_id, spi.custom_industry_name, i.industry_name
        FROM public.student_preferred_industry spi
        LEFT JOIN public.industry i ON i.industry_id = spi.industry_id
        WHERE spi.student_id = $1
        ORDER BY i.industry_name ASC
      `,
      [studentId],
    );

    return {
      student,
      academic,
      internshipPreference: preference ?? null,
      preferredIndustries,
    };
  }

  async upsertStudentProfile(studentId: number, dto: StudentProfileUpdateDto) {
    await this.dataSource.transaction(async (manager) => {
      const studentExists = await manager.query(
        `SELECT student_id FROM public.student WHERE student_id = $1`,
        [studentId],
      );

      if (!studentExists.length) {
        throw new NotFoundException('Student not found');
      }

      await manager.query(
        `
          UPDATE public.student
          SET first_name = $2,
              middle_name = $3,
              last_name = $4,
              extension_name = $5,
              sex = $6,
              birth_date = $7,
              contact_number = $8,
              contact_email = $9,
              linkedin_url = $10,
              address_line = $11,
              address_barangay = $12,
              address_district = $13,
              address_city = $14,
              inquiry_method = $15,
              photo_file_path = $16
          WHERE student_id = $1
        `,
        [
          studentId,
          dto.firstName,
          dto.middleName ?? null,
          dto.lastName,
          dto.extensionName ?? null,
          dto.sex,
          dto.birthDate,
          dto.contactNumber,
          dto.contactEmail,
          dto.linkedinUrl ?? null,
          dto.addressLine,
          dto.addressBarangay,
          dto.addressDistrict,
          dto.addressCity,
          dto.inquiryMethod,
          dto.photoFilePath ?? null,
        ],
      );

      if (dto.academic) {
        const existingAcademic = await manager.query(
          `SELECT student_id FROM public.student_academic_information WHERE student_id = $1`,
          [studentId],
        );

        if (existingAcademic.length) {
          await manager.query(
            `
              UPDATE public.student_academic_information
              SET school_name = $2,
                  year_level = $3,
                  strand_program = $4
              WHERE student_id = $1
            `,
            [
              studentId,
              dto.academic.schoolName,
              dto.academic.yearLevel,
              dto.academic.strandProgram,
            ],
          );
        } else {
          await manager.query(
            `
              INSERT INTO public.student_academic_information (
                student_id,
                school_name,
                year_level,
                strand_program
              ) VALUES ($1, $2, $3, $4)
            `,
            [
              studentId,
              dto.academic.schoolName,
              dto.academic.yearLevel,
              dto.academic.strandProgram,
            ],
          );
        }
      }

      if (dto.internshipPreference) {
        const existingPreference = await manager.query(
          `SELECT student_id FROM public.internship_preference WHERE student_id = $1`,
          [studentId],
        );

        if (existingPreference.length) {
          await manager.query(
            `
              UPDATE public.internship_preference
              SET required_hours = $2,
                  available_days = $3,
                  allows_outside_preferred_field = $4,
                  start_date = $5,
                  preferred_company_type = $6
              WHERE student_id = $1
            `,
            [
              studentId,
              dto.internshipPreference.requiredHours,
              dto.internshipPreference.availableDays,
              dto.internshipPreference.allowsOutsidePreferredField,
              dto.internshipPreference.startDate,
              dto.internshipPreference.preferredCompanyType,
            ],
          );
        } else {
          await manager.query(
            `
              INSERT INTO public.internship_preference (
                student_id,
                required_hours,
                available_days,
                allows_outside_preferred_field,
                start_date,
                preferred_company_type
              ) VALUES ($1, $2, $3, $4, $5, $6)
            `,
            [
              studentId,
              dto.internshipPreference.requiredHours,
              dto.internshipPreference.availableDays,
              dto.internshipPreference.allowsOutsidePreferredField,
              dto.internshipPreference.startDate,
              dto.internshipPreference.preferredCompanyType,
            ],
          );
        }
      }

      if (dto.preferredIndustries) {
        await manager.query(
          `DELETE FROM public.student_preferred_industry WHERE student_id = $1`,
          [studentId],
        );

        for (const preferredIndustry of dto.preferredIndustries) {
          await manager.query(
            `
              INSERT INTO public.student_preferred_industry (
                student_id,
                industry_id,
                custom_industry_name
              ) VALUES ($1, $2, $3)
            `,
            [
              studentId,
              preferredIndustry.industryId,
              preferredIndustry.customIndustryName ?? null,
            ],
          );
        }
      }
    });

    return this.getStudentProfile(studentId);
  }

  async getStudentApplicationStatus(studentId: number, applicationId: number) {
    Logger.log(`${studentId}, ${applicationId}`);
    const [application] = await this.dataSource.query(
      `
        SELECT a.application_id,
               a.student_id,
               a.application_status,
               a.student_response,
               a.submitted_at,
               a.updated_at,
               a.remark
        FROM public.application a
        WHERE a.application_id = $1
          AND a.student_id = $2
      `,
      [applicationId, studentId],
    );

    if (!application) {
      throw new NotFoundException('Application not found for this student');
    }

    return application;
  }

  // Upserts the student's requirement rows using the current requirement_type catalog.
  async uploadStudentRequirements(
    studentId: number,
    submissions: StudentRequirementUploadDto[],
  ) {
    const studentExists = await this.studentRepo.findOne({
      where: { studentId },
    });

    if (!studentExists) {
      throw new NotFoundException('Student not found');
    }

    const results: any[] = [];

    for (const submission of submissions) {
      const normalizedType = this.normalizeRequirementType(submission.requirementType);

      const requirementTypeRecord = await this.dataSource.query(
        `
          SELECT requirement_type_id, requirement_type_name
          FROM public.requirement_type
          WHERE lower(requirement_type_name) = lower($1)
        `,
        [normalizedType],
      );

      let requirementTypeId: number;
      if (requirementTypeRecord.length) {
        requirementTypeId = requirementTypeRecord[0].requirement_type_id;
      } else {
        const [inserted] = await this.dataSource.query(
          `
            INSERT INTO public.requirement_type (requirement_type_name)
            VALUES ($1)
            RETURNING requirement_type_id, requirement_type_name
          `,
          [normalizedType],
        );
        requirementTypeId = inserted.requirement_type_id;
      }

      const [existing] = await this.dataSource.query(
        `
          SELECT student_requirement_submission_id
          FROM public.student_requirement_submission
          WHERE student_id = $1 AND requirement_type_id = $2
        `,
        [studentId, requirementTypeId],
      );

      let row;
      if (existing) {
        [row] = await this.dataSource.query(
          `
            UPDATE public.student_requirement_submission
            SET requirement_name = $3,
                requirement_file_path = $4,
                updated_at = CURRENT_TIMESTAMP
            WHERE student_requirement_submission_id = $2
            RETURNING *
          `,
          [studentId, existing.student_requirement_submission_id, submission.requirementName, submission.requirementFilePath],
        );
      } else {
        [row] = await this.dataSource.query(
          `
            INSERT INTO public.student_requirement_submission (
              student_id,
              requirement_type_id,
              requirement_name,
              requirement_file_path
            ) VALUES ($1, $2, $3, $4)
            RETURNING *
          `,
          [studentId, requirementTypeId, submission.requirementName, submission.requirementFilePath],
        );
      }

      results.push({
        requirementType: normalizedType,
        submission: row,
      });
    }

    return results;
  }

  // Records the assignment clock-in for the current day and validates the assignment ownership.
  async timeInDtr(studentId: number, dto: { internshipAssignmentId: number; timeIn?: string }) {
    const assignment = await this.validateAssignmentForStudent(studentId, dto.internshipAssignmentId);
    const attendanceDate = new Date();
    const timeInValue = dto.timeIn ?? this.currentClockTime();

    const [record] = await this.dataSource.query(
      `
        INSERT INTO public.attendance_record (
          internship_assignment_id,
          attendance_date,
          time_in,
          time_in_status,
          rendered_hours_status,
          photo_file_path
        ) VALUES ($1, CURRENT_DATE, $2, $3, 'incomplete', NULL)
        ON CONFLICT (internship_assignment_id, attendance_date)
        DO UPDATE SET
          time_in = EXCLUDED.time_in,
          time_in_status = EXCLUDED.time_in_status,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `,
      [assignment.internship_assignment_id, timeInValue, this.resolveTimeInStatus(timeInValue)],
    );

    return record;
  }

  // Closes the same day attendance row and computes the rendered hours from the in/out timestamps.
  async timeOutDtr(studentId: number, dto: { internshipAssignmentId: number; timeOut?: string }) {
    const assignment = await this.validateAssignmentForStudent(studentId, dto.internshipAssignmentId);
    const [record] = await this.dataSource.query(
      `
        SELECT *
        FROM public.attendance_record
        WHERE internship_assignment_id = $1 AND attendance_date = CURRENT_DATE
      `,
      [assignment.internship_assignment_id],
    );

    if (!record) {
      throw new UnprocessableEntityException('A time-in entry is required before time-out');
    }

    const timeOutValue = dto.timeOut ?? this.currentClockTime();
    const hoursRendered = this.calculateHoursRendered(record.time_in, timeOutValue);

    const [updated] = await this.dataSource.query(
      `
        UPDATE public.attendance_record
        SET time_out = $2,
            hours_rendered = $3,
            rendered_hours_status = $4,
            updated_at = CURRENT_TIMESTAMP
        WHERE attendance_record_id = $1
        RETURNING *
      `,
      [record.attendance_record_id, timeOutValue, hoursRendered, hoursRendered > 0 ? 'complete' : 'incomplete'],
    );

    return updated;
  }

  private normalizeRequirementType(value: string): string {
    const map: Record<string, string> = {
      'proof of residency': 'proof_of_residency',
      'proof-of-residency': 'proof_of_residency',
      'latest credentials': 'latest_credentials',
      'latest-credentials': 'latest_credentials',
      'curriculum vitae/resume': 'curriculum_vitae_resume',
      'curriculum-vitae-resume': 'curriculum_vitae_resume',
      'curriculum vitae': 'curriculum_vitae_resume',
      'resume': 'curriculum_vitae_resume',
      'letter of intent': 'letter_of_intent',
      'letter-of-intent': 'letter_of_intent',
      'recommendation letter': 'recommendation_letter',
      'recommendation-letter': 'recommendation_letter',
    };

    const normalized = (value ?? '').trim().toLowerCase().replace(/\s+/g, '_');
    return map[normalized] ?? normalized;
  }

  private async validateAssignmentForStudent(studentId: number, assignmentId: number) {
    Logger.log(`${studentId}, ${assignmentId}`);
    const [assignment] = await this.dataSource.query(
      `
        SELECT ia.*
        FROM public.internship_assignment ia
        JOIN public.referral r ON r.referral_id = ia.referral_id
        JOIN public.application a ON a.application_id = r.application_id
        WHERE ia.internship_assignment_id = $1 AND a.student_id = $2
      `,
      [assignmentId, studentId],
    );

    if (!assignment) {
      throw new NotFoundException('No internship assignment exists for this student');
    }

    return assignment;
  }

  private resolveTimeInStatus(timeInValue: string): 'on_time' | 'late' {
    const [hours, minutes] = timeInValue.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    return totalMinutes <= 9 * 60 ? 'on_time' : 'late';
  }

  private currentClockTime() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;
  }

  private calculateHoursRendered(timeIn: string, timeOut: string): number {
    const start = this.toMinutes(timeIn);
    const end = this.toMinutes(timeOut);
    if (end <= start) {
      return 0;
    }

    return Number(((end - start) / 60).toFixed(2));
  }

  private toMinutes(value: string): number {
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
  }
}
