import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { existsSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { Student } from '../entities/student.entity';
import {
  CreateStudentApplicationDto,
  StudentAssignmentRemarkDto,
  StudentApplicationResponseDto,
  StudentCompanyReviewDto,
  StudentProfileUpdateDto,
  StudentRequirementUploadDto,
} from '../dto/students.dto';
import { withStatusActor } from '../../database/status-actor.transaction';
import { StudentResponse } from '../../common/enums/student-response.enum';
import { ProfilePictureStorageService } from '../../storage/profile-picture-storage.service';
import {
  assertValidTime,
  assertValidDate,
  currentManilaDate,
  currentManilaTime,
  isScheduledWorkday,
} from '../../employer/utils/time.utils';
import type { StudentAttendanceHistoryQueryDto } from '../dto/student-attendance-query.dto';

type StatusActor = { userAccountId?: number };

type ApplicationWorkflowRow = {
  application_id: number;
  application_status: string;
  student_response: string;
  referral_id: number;
  referral_status: string;
  company_response: string;
};

type StudentAssignmentRow = {
  internship_assignment_id: number | string;
  student_full_name: string;
  student_contact_email: string;
  student_contact_number: string;
  student_address: string;
  student_photo_file_path: string | null;
  student_profile_updated_at: Date | string;
  strand_program: string | null;
  year_level: string | null;
  school_name: string | null;
  company_id: number | string;
  company_name: string;
  company_logo_file_path: string | null;
  opportunity_id: number | string;
  job_title: string;
  working_days: number[];
  required_minutes: number | string;
  total_rendered_minutes: number | string;
  start_date: string;
  expected_end_date: string | null;
  end_date: string | null;
  ended_at: Date | string | null;
  start_shift: string;
  end_shift: string;
  assignment_status: string;
  company_completion_remark: string | null;
  company_cancellation_remark: string | null;
  student_withdrawal_remark: string | null;
  review_rating: number | string | null;
  review_remark: string | null;
  reviewed_at: Date | string | null;
  created_at: Date | string;
};

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly profilePictures: ProfilePictureStorageService,
  ) {}

  async findById(id: number): Promise<Student | null> {
    return this.studentRepo.findOne({ where: { studentId: id } });
  }

  // Reads the student plus the joined academic, preference, and preferred-industry records.
  async getStudentProfile(studentId: number) {
    const [student] = await this.dataSource.query(
      `
        SELECT s.*, s.birth_date::text AS birth_date
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
        SELECT ip.*, ip.start_date::text AS start_date
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

  async getStudentResume(studentId: number) {
    const [resume] = await this.dataSource.query(
      `
        SELECT srs.student_requirement_submission_id,
               srs.student_id,
               srs.requirement_name,
               srs.requirement_file_path,
               srs.submitted_at,
               srs.updated_at
        FROM public.student_requirement_submission srs
        JOIN public.requirement_type rt
          ON rt.requirement_type_id = srs.requirement_type_id
        WHERE srs.student_id = $1
          AND rt.requirement_type_name = 'curriculum_vitae_resume'
        ORDER BY srs.updated_at DESC
        LIMIT 1
      `,
      [studentId],
    );

    if (!resume) {
      const student = await this.findById(studentId);
      if (!student) throw new NotFoundException('Student not found');
      throw new NotFoundException('Resume not found for this student');
    }

    return resume;
  }

  async getStudentRequirements(studentId: number) {
    const [student] = await this.dataSource.query(
      `
        SELECT s.*
        FROM public.student s
        WHERE s.student_id = $1
      `,
      [studentId],
    );

    if (!student) throw new NotFoundException('Student not found');

    const requirements = await this.dataSource.query(
      `
        SELECT srs.student_requirement_submission_id,
               srs.student_id,
               srs.requirement_type_id,
               rt.requirement_type_name,
               srs.requirement_name,
               srs.requirement_file_path,
               srs.submitted_at,
               srs.updated_at
        FROM public.student_requirement_submission srs
        JOIN public.requirement_type rt
          ON rt.requirement_type_id = srs.requirement_type_id
        WHERE srs.student_id = $1
        ORDER BY rt.requirement_type_name ASC, srs.updated_at DESC
      `,
      [studentId],
    );

    return { student, requirements };
  }

  async upsertStudentProfile(studentId: number, dto: StudentProfileUpdateDto) {
    assertValidDate(dto.birthDate, 'birthDate');
    const today = currentManilaDate();
    if (dto.birthDate >= today) {
      throw new BadRequestException('birthDate must be in the past.');
    }
    if (dto.internshipPreference) {
      assertValidDate(
        dto.internshipPreference.startDate,
        'internshipPreference.startDate',
      );
      if (dto.internshipPreference.startDate < today) {
        throw new BadRequestException(
          'internshipPreference.startDate cannot be in the past.',
        );
      }
    }
    await this.dataSource.transaction(async (manager) => {
      const studentExists = await manager.query(
        `SELECT student_id, photo_file_path FROM public.student WHERE student_id = $1`,
        [studentId],
      );

      if (!studentExists.length) {
        throw new NotFoundException('Student not found');
      }

      const isSavingInternshipPreferences =
        dto.internshipPreference !== undefined ||
        dto.preferredIndustries !== undefined;
      if (
        isSavingInternshipPreferences &&
        (!dto.internshipPreference || !dto.preferredIndustries)
      ) {
        throw new BadRequestException(
          'Internship preferences and at least one preferred field are required together.',
        );
      }
      if (dto.preferredIndustries) {
        await this.validatePreferredIndustries(
          manager,
          dto.preferredIndustries,
        );
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
          dto.photoFilePath === undefined
            ? studentExists[0].photo_file_path
            : dto.photoFilePath,
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

  private async validatePreferredIndustries(
    manager: EntityManager,
    preferredIndustries: Array<{
      industryId: number;
      customIndustryName?: string;
    }>,
  ): Promise<void> {
    const industryIds = preferredIndustries.map((item) => item.industryId);
    if (new Set(industryIds).size !== industryIds.length) {
      throw new BadRequestException('Preferred industry IDs must be unique.');
    }

    const industries: Array<{
      industry_id: number;
      is_custom_text: boolean;
    }> = await manager.query(
      `
        SELECT industry_id, is_custom_text
        FROM public.industry
        WHERE industry_id = ANY($1::int[])
      `,
      [industryIds],
    );
    if (industries.length !== industryIds.length) {
      throw new BadRequestException('A preferred industry does not exist.');
    }

    const customByIndustryId = new Map(
      industries.map((industry) => [
        Number(industry.industry_id),
        industry.is_custom_text,
      ]),
    );
    for (const preferredIndustry of preferredIndustries) {
      const isCustom = customByIndustryId.get(preferredIndustry.industryId);
      const customName = preferredIndustry.customIndustryName?.trim();
      if (isCustom && !customName) {
        throw new BadRequestException(
          'customIndustryName is required for the custom industry.',
        );
      }
      if (!isCustom && preferredIndustry.customIndustryName !== undefined) {
        throw new BadRequestException(
          'customIndustryName is allowed only for the custom industry.',
        );
      }
      if (isCustom) {
        preferredIndustry.customIndustryName = customName;
      }
    }
  }

  async replaceProfilePicture(studentId: number, file: Express.Multer.File) {
    const student = await this.studentRepo.findOne({ where: { studentId } });
    if (!student) throw new NotFoundException('Student not found');

    const oldPath = student.photoFilePath;
    const newPath = await this.profilePictures.storePerson(file, {
      userAccountId: student.userAccountId,
      firstName: student.firstName,
      lastName: student.lastName,
    });

    try {
      await this.studentRepo.update({ studentId }, { photoFilePath: newPath });
    } catch (error) {
      if (oldPath !== newPath) await this.profilePictures.delete(newPath);
      throw error;
    }

    if (oldPath !== newPath) {
      try {
        await this.profilePictures.delete(oldPath);
      } catch {
        // The new DB reference remains valid if an obsolete file cannot be removed.
      }
    }
    return this.getStudentProfile(studentId);
  }

  async createStudentApplication(
    studentId: number,
    dto: CreateStudentApplicationDto,
    currentUser: any,
  ) {
    const student = await this.studentRepo.findOne({ where: { studentId } });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const currentAssignments = await this.dataSource.query<
      Array<{ internship_assignment_id: number }>
    >(
      `SELECT ia.internship_assignment_id
       FROM public.internship_assignment ia
       JOIN public.referral r ON r.referral_id = ia.referral_id
       JOIN public.application a ON a.application_id = r.application_id
       WHERE a.student_id = $1
         AND ia.assignment_status <> 'finalized'
         AND ia.deleted_at IS NULL
       LIMIT 1`,
      [studentId],
    );
    if (currentAssignments.length > 0) {
      throw new ConflictException(
        'You cannot apply for another internship while your current internship has not yet been finalized.',
      );
    }

    // Validate student personal information completeness
    if (
      !student.firstName ||
      !student.lastName ||
      !student.sex ||
      !student.birthDate ||
      !student.contactNumber ||
      !student.contactEmail ||
      !student.addressLine ||
      !student.addressBarangay ||
      !student.addressCity
    ) {
      throw new BadRequestException(
        'Incomplete personal information. Please complete your personal profile before applying.',
      );
    }

    // Validate student academic information completeness
    const [academic] = await this.dataSource.query(
      `
        SELECT school_name, year_level, strand_program
        FROM public.student_academic_information
        WHERE student_id = $1
      `,
      [studentId],
    );

    if (
      !academic ||
      !academic.school_name ||
      !academic.year_level ||
      !academic.strand_program
    ) {
      throw new BadRequestException(
        'Incomplete academic information. Please provide your school, year level, and program before applying.',
      );
    }

    // Validate student internship preference completeness
    const [preference] = await this.dataSource.query(
      `
        SELECT required_hours, available_days, start_date, preferred_company_type
        FROM public.internship_preference
        WHERE student_id = $1
      `,
      [studentId],
    );

    if (
      !preference ||
      !preference.required_hours ||
      !preference.available_days ||
      !preference.start_date ||
      !preference.preferred_company_type
    ) {
      throw new BadRequestException(
        'Incomplete internship preferences. Please configure your required hours, schedule, and preferences before applying.',
      );
    }

    // Validate student preferred industry
    const preferredIndustries = await this.dataSource.query(
      `
        SELECT industry_id
        FROM public.student_preferred_industry
        WHERE student_id = $1
      `,
      [studentId],
    );

    if (!preferredIndustries.length) {
      throw new BadRequestException(
        'Please select at least one preferred field of internship before applying.',
      );
    }

    // Verify student has uploaded all 4 pre-referral requirements
    const requiredTypes = [
      'curriculum_vitae_resume',
      'proof_of_residency',
      'latest_credentials',
      'letter_of_intent',
    ];

    const submissions = await this.dataSource.query(
      `
        SELECT rt.requirement_type_name
        FROM public.student_requirement_submission srs
        JOIN public.requirement_type rt ON rt.requirement_type_id = srs.requirement_type_id
        WHERE srs.student_id = $1
      `,
      [studentId],
    );

    const submittedNames = submissions.map((s: any) =>
      this.normalizeRequirementType(s.requirement_type_name),
    );

    const missingRequirements = requiredTypes.filter(
      (type) => !submittedNames.includes(type),
    );

    if (missingRequirements.length > 0) {
      const typeLabels: Record<string, string> = {
        curriculum_vitae_resume: 'Curriculum Vitae / Resume',
        proof_of_residency: 'Proof of Residency',
        latest_credentials: 'Latest Academic Credentials',
        letter_of_intent: 'Letter of Intent / Endorsement',
      };
      const missingLabels = missingRequirements
        .map((t) => typeLabels[t] || t)
        .join(', ');
      throw new BadRequestException(
        `All pre-referral requirements must be submitted before applying. Missing: ${missingLabels}`,
      );
    }

    try {
      return await withStatusActor(
        this.dataSource,
        currentUser?.userAccountId ?? null,
        async (runner) => {
          // Serialize all application submissions for this Student, including
          // simultaneous submissions to different opportunities.
          await runner.query('SELECT pg_advisory_xact_lock($1, $2)', [
            77321,
            studentId,
          ]);

          const lockedCurrentAssignments = await runner.query(
            `SELECT ia.internship_assignment_id
             FROM public.internship_assignment ia
             JOIN public.referral r ON r.referral_id = ia.referral_id
             JOIN public.application a ON a.application_id = r.application_id
             WHERE a.student_id = $1
               AND ia.assignment_status <> 'finalized'
               AND ia.deleted_at IS NULL
             FOR SHARE OF ia`,
            [studentId],
          );
          if (lockedCurrentAssignments.length > 0) {
            throw new ConflictException(
              'You cannot apply for another internship while your current internship has not yet been finalized.',
            );
          }

          // Serialize application submissions for this student/opportunity pair.
          // The active-only unique index remains the final concurrency guard.
          await runner.query('SELECT pg_advisory_xact_lock($1, $2)', [
            studentId,
            dto.opportunityId,
          ]);

          const [opportunity] = await runner.query(
            `
              SELECT opportunity_id, title, opportunity_status, application_deadline,
                     (application_deadline AT TIME ZONE 'Asia/Manila')::date
                       < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::date AS deadline_passed
              FROM public.opportunity
              WHERE opportunity_id = $1
              FOR SHARE
            `,
            [dto.opportunityId],
          );

          if (!opportunity) {
            throw new NotFoundException('Opportunity not found');
          }

          if (opportunity.opportunity_status !== 'open') {
            throw new BadRequestException(
              `Cannot apply to an opportunity that is ${opportunity.opportunity_status}`,
            );
          }

          if (opportunity.deadline_passed) {
            throw new BadRequestException(
              'The application deadline for this opportunity has already passed',
            );
          }

          const attempts = (await runner.query(
            `
              SELECT a.application_id, a.application_status,
                     a.student_response, r.company_response
              FROM public.application a
              LEFT JOIN public.referral r ON r.application_id = a.application_id
              WHERE a.student_id = $1 AND a.opportunity_id = $2
              ORDER BY a.application_id
              FOR UPDATE OF a
            `,
            [studentId, dto.opportunityId],
          )) as unknown as Array<{
            application_id: number;
            application_status: string;
            student_response: string;
            company_response: string | null;
          }>;

          const activeAttempt = attempts.find((attempt) =>
            ['submitted', 'under_review', 'approved_for_referral'].includes(
              attempt.application_status,
            ),
          );
          if (activeAttempt) {
            throw new ConflictException(
              `You already have an active application (ID: ${activeAttempt.application_id}, Status: ${activeAttempt.application_status}) for this opportunity`,
            );
          }

          const blockedAttempt = attempts.find((attempt) => {
            if (attempt.application_status === 'withdrawn') return false;
            if (attempt.application_status === 'rejected_for_referral') {
              return false;
            }
            if (
              attempt.application_status === 'closed' &&
              attempt.company_response === 'rejected'
            ) {
              return false;
            }
            if (
              attempt.application_status === 'closed' &&
              attempt.company_response === 'accepted' &&
              attempt.student_response === 'declined'
            ) {
              return false;
            }
            return true;
          });
          if (blockedAttempt) {
            const reason =
              blockedAttempt.application_status === 'expired'
                ? 'An expired application cannot be reapplied.'
                : 'You cannot reapply after accepting this internship offer.';
            throw new ConflictException(reason);
          }

          const [created] = await runner.query(
            `
              INSERT INTO public.application (
                student_id,
                opportunity_id,
                application_status,
                student_response,
                remark
              ) VALUES ($1, $2, 'submitted', 'pending', $3)
              RETURNING *
            `,
            [studentId, dto.opportunityId, dto.remark ?? null],
          );

          return {
            applicationId: created.application_id,
            studentId: created.student_id,
            opportunityId: created.opportunity_id,
            applicationStatus: created.application_status,
            studentResponse: created.student_response,
            submittedAt: created.submitted_at,
            updatedAt: created.updated_at,
            remark: created.remark,
          };
        },
      );
    } catch (error: unknown) {
      const databaseError = error as { code?: string; constraint?: string };
      if (
        databaseError.code === '23505' &&
        databaseError.constraint === 'uq_application_active_student_opportunity'
      ) {
        throw new ConflictException(
          'You already have an active application for this opportunity.',
        );
      }
      throw error;
    }
  }

  async getStudentApplications(studentId: number) {
    const records = await this.dataSource.query(
      `
        SELECT 
          ad.application_id AS "applicationId",
          ad.submitted_at AS "submittedAt",
          ad.application_status AS "applicationStatus",
          ad.application_remark AS "applicationRemark",
          ad.student_response AS "studentResponse",
          ad.student_responded_at AS "studentRespondedAt",
          ad.opportunity_id AS "opportunityId",
          ad.opportunity_title AS "opportunityTitle",
          ad.opportunity_status AS "opportunityStatus",
          ad.application_deadline AS "applicationDeadline",
          ad.work_arrangement AS "workArrangement",
          ad.minimum_required_hours AS "minimumRequiredHours",
          ad.company_id AS "companyId",
          ad.company_name AS "companyName",
          ad.industry_name AS "industryName",
          c.logo_file_path AS "companyLogoFilePath",
          c.updated_at AS "companyProfileUpdatedAt",
          ad.referral_id AS "referralId",
          ad.referral_status AS "referralStatus",
          ad.company_response AS "companyResponse",
          ad.internship_assignment_id AS "internshipAssignmentId",
          ad.assignment_status AS "assignmentStatus"
        FROM public.vw_application_details ad
        JOIN public.company c ON c.company_id = ad.company_id
        WHERE ad.student_id = $1
          AND NOT EXISTS (
            SELECT 1 FROM public.application_visibility av
            WHERE av.application_id = ad.application_id
              AND av.student_hidden_at IS NOT NULL
          )
        ORDER BY ad.submitted_at DESC
      `,
      [studentId],
    );

    return records.map((r: any) => ({
      applicationId: r.applicationId,
      submittedAt: r.submittedAt,
      applicationStatus: r.applicationStatus,
      applicationRemark: r.applicationRemark,
      studentResponse: r.studentResponse,
      studentRespondedAt: r.studentRespondedAt,
      opportunity: {
        opportunityId: r.opportunityId,
        title: r.opportunityTitle,
        opportunityStatus: r.opportunityStatus,
        applicationDeadline: r.applicationDeadline,
        workArrangement: r.workArrangement,
        minimumRequiredHours: r.minimumRequiredHours,
      },
      company: {
        companyId: r.companyId,
        companyName: r.companyName,
        industryName: r.industryName,
        logoFilePath: r.companyLogoFilePath,
        profileUpdatedAt: r.companyProfileUpdatedAt,
      },
      referral: r.referralId
        ? {
            referralId: r.referralId,
            referralStatus: r.referralStatus,
            companyResponse: r.companyResponse,
          }
        : null,
      assignment: r.internshipAssignmentId
        ? {
            internshipAssignmentId: r.internshipAssignmentId,
            assignmentStatus: r.assignmentStatus,
          }
        : null,
    }));
  }

  async getStudentApplicationStatus(studentId: number, applicationId: number) {
    const [detail] = await this.dataSource.query(
      `
        SELECT 
          ad.application_id,
          ad.submitted_at,
          ad.application_status,
          ad.application_remark,
          ad.student_response,
          ad.student_responded_at,
          ad.opportunity_id,
          ad.opportunity_title,
          ad.opportunity_status,
          ad.application_deadline,
          ad.work_arrangement,
          ad.minimum_required_hours,
          ad.company_id,
          ad.company_name,
          ad.industry_name,
          c.logo_file_path AS company_logo_file_path,
          c.updated_at AS company_profile_updated_at,
          ad.referral_id,
          ad.referral_status,
          ad.company_response,
          r.referred_at,
          r.company_responded_at,
          r.remark AS referral_remark,
          ad.internship_assignment_id,
          ad.assignment_status
        FROM public.vw_application_details ad
        JOIN public.company c ON c.company_id = ad.company_id
        LEFT JOIN public.referral r ON r.referral_id = ad.referral_id
        WHERE ad.application_id = $1 AND ad.student_id = $2
          AND NOT EXISTS (
            SELECT 1 FROM public.application_visibility av
            WHERE av.application_id = ad.application_id
              AND av.student_hidden_at IS NOT NULL
          )
      `,
      [applicationId, studentId],
    );

    if (!detail) {
      throw new NotFoundException('Application not found for this student');
    }

    let interview: any = null;
    if (detail.referral_id) {
      const [interviewRow] = await this.dataSource.query(
        `
          SELECT 
            iv.interview_id,
            iv.scheduled_at,
            iv.interview_mode,
            iv.physical_location,
            iv.online_meeting_url,
            iv.remark,
            iv.created_at,
            iv.updated_at
          FROM public.interview iv
          WHERE iv.referral_id = $1
          ORDER BY iv.scheduled_at DESC
          LIMIT 1
        `,
        [detail.referral_id],
      );
      if (interviewRow) {
        interview = interviewRow;
      }
    }

    const timeline = await this.dataSource.query(
      `
        SELECT 
          ash.application_status_history_id AS "statusHistoryId",
          ash.previous_application_status AS "previousStatus",
          ash.new_application_status AS "newStatus",
          ash.changed_at AS "changedAt",
          ua.user_role AS "changedByRole"
        FROM public.application_status_history ash
        LEFT JOIN public.user_account ua ON ua.user_account_id = ash.changed_by_user_account_id
        WHERE ash.application_id = $1
        ORDER BY ash.changed_at ASC
      `,
      [applicationId],
    );

    const referralTimeline = detail.referral_id
      ? await this.dataSource.query(
          `
            SELECT
              rsh.referral_status_history_id AS "statusHistoryId",
              rsh.previous_referral_status AS "previousStatus",
              rsh.new_referral_status AS "newStatus",
              rsh.changed_at AS "changedAt",
              ua.user_role AS "changedByRole"
            FROM public.referral_status_history rsh
            LEFT JOIN public.user_account ua
              ON ua.user_account_id = rsh.changed_by_user_account_id
            WHERE rsh.referral_id = $1
            ORDER BY rsh.changed_at ASC
          `,
          [detail.referral_id],
        )
      : [];

    return {
      applicationId: detail.application_id,
      studentId,
      applicationStatus: detail.application_status,
      studentResponse: detail.student_response,
      studentRespondedAt: detail.student_responded_at,
      submittedAt: detail.submitted_at,
      remark: detail.application_remark,
      opportunity: {
        opportunityId: detail.opportunity_id,
        title: detail.opportunity_title,
        opportunityStatus: detail.opportunity_status,
        applicationDeadline: detail.application_deadline,
        workArrangement: detail.work_arrangement,
        minimumRequiredHours: detail.minimum_required_hours,
      },
      company: {
        companyId: detail.company_id,
        companyName: detail.company_name,
        industryName: detail.industry_name,
        logoFilePath: detail.company_logo_file_path,
        profileUpdatedAt: detail.company_profile_updated_at,
      },
      referral: detail.referral_id
        ? {
            referralId: detail.referral_id,
            referralStatus: detail.referral_status,
            companyResponse: detail.company_response,
            referredAt: detail.referred_at,
            companyRespondedAt: detail.company_responded_at,
            remark: detail.referral_remark,
          }
        : null,
      interview,
      assignment: detail.internship_assignment_id
        ? {
            internshipAssignmentId: detail.internship_assignment_id,
            assignmentStatus: detail.assignment_status,
          }
        : null,
      timeline,
      referralTimeline,
    };
  }

  async respondToApplicationOffer(
    studentId: number,
    applicationId: number,
    dto: StudentApplicationResponseDto,
    currentUser: StatusActor,
  ) {
    return withStatusActor(
      this.dataSource,
      currentUser?.userAccountId ?? null,
      async (runner) => {
        const rows = (await runner.query(
          `
            SELECT a.application_id, a.application_status, a.student_response,
                   r.referral_id, r.referral_status, r.company_response
            FROM public.application a
            JOIN public.referral r ON r.application_id = a.application_id
            WHERE a.application_id = $1 AND a.student_id = $2
            FOR UPDATE OF a, r
          `,
          [applicationId, studentId],
        )) as unknown as ApplicationWorkflowRow[];
        const application = rows[0];
        if (!application) {
          throw new NotFoundException('Application not found for this student');
        }
        if (
          application.application_status !== 'approved_for_referral' ||
          application.referral_status !== 'under_review' ||
          application.company_response !== 'accepted' ||
          application.student_response !== 'pending'
        ) {
          throw new ConflictException(
            'This internship offer is no longer awaiting a student response.',
          );
        }

        const [updated] = await runner.query(
          `
            UPDATE public.application
            SET student_response = $2,
                student_responded_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE application_id = $1
            RETURNING *
          `,
          [applicationId, dto.response],
        );

        await runner.query(
          `UPDATE public.referral
           SET referral_status = 'closed', updated_at = CURRENT_TIMESTAMP
           WHERE referral_id = $1`,
          [application.referral_id],
        );
        await runner.query(
          `UPDATE public.application
           SET application_status = 'closed', updated_at = CURRENT_TIMESTAMP
           WHERE application_id = $1`,
          [applicationId],
        );

        if (dto.response === StudentResponse.ACCEPTED) {
          const otherApplications = (await runner.query(
            `SELECT application_id
             FROM public.application
             WHERE student_id = $1
               AND application_id <> $2
               AND application_status IN ('submitted', 'under_review', 'approved_for_referral')
             ORDER BY application_id
             FOR UPDATE`,
            [studentId, applicationId],
          )) as unknown as Array<{ application_id: number }>;
          const otherIds = otherApplications.map((row) =>
            Number(row.application_id),
          );
          if (otherIds.length > 0) {
            await runner.query(
              `SELECT referral_id
               FROM public.referral
               WHERE application_id = ANY($1::integer[])
               ORDER BY referral_id
               FOR UPDATE`,
              [otherIds],
            );
            await runner.query(
              `UPDATE public.referral
               SET referral_status = 'withdrawn', updated_at = CURRENT_TIMESTAMP
               WHERE application_id = ANY($1::integer[])
                 AND referral_status IN ('sent', 'under_review')`,
              [otherIds],
            );
            await runner.query(
              `UPDATE public.application
               SET application_status = 'withdrawn', updated_at = CURRENT_TIMESTAMP
               WHERE application_id = ANY($1::integer[])
                 AND application_status IN ('submitted', 'under_review', 'approved_for_referral')`,
              [otherIds],
            );
          }
        }
        return updated;
      },
    );
  }

  async withdrawApplication(
    studentId: number,
    applicationId: number,
    currentUser: StatusActor,
  ) {
    return withStatusActor(
      this.dataSource,
      currentUser?.userAccountId ?? null,
      async (runner) => {
        const rows = (await runner.query(
          `SELECT a.application_id, a.application_status, a.student_response
           FROM public.application a
           WHERE a.application_id = $1 AND a.student_id = $2
           FOR UPDATE OF a`,
          [applicationId, studentId],
        )) as unknown as Array<
          Pick<
            ApplicationWorkflowRow,
            'application_id' | 'application_status' | 'student_response'
          >
        >;
        const application = rows[0];
        if (!application) {
          throw new NotFoundException('Application not found for this student');
        }
        const referrals = (await runner.query(
          `SELECT referral_id, referral_status, company_response
           FROM public.referral
           WHERE application_id = $1
           FOR UPDATE`,
          [applicationId],
        )) as unknown as Array<
          Pick<
            ApplicationWorkflowRow,
            'referral_id' | 'referral_status' | 'company_response'
          >
        >;
        const referral = referrals[0] ?? null;
        const activeApplication = [
          'submitted',
          'under_review',
          'approved_for_referral',
        ].includes(application.application_status);
        const activeReferral =
          !referral ||
          ['sent', 'under_review'].includes(referral.referral_status);
        if (
          !activeApplication ||
          !activeReferral ||
          application.student_response !== 'pending' ||
          referral?.company_response === 'rejected'
        ) {
          throw new ConflictException(
            'This application is no longer eligible for withdrawal.',
          );
        }
        if (referral) {
          await runner.query(
            `UPDATE public.referral
             SET referral_status = 'withdrawn', updated_at = CURRENT_TIMESTAMP
             WHERE referral_id = $1`,
            [referral.referral_id],
          );
        }
        const [updated] = await runner.query(
          `
            UPDATE public.application
            SET application_status = 'withdrawn',
                updated_at = CURRENT_TIMESTAMP
            WHERE application_id = $1
            RETURNING *
          `,
          [applicationId],
        );
        return updated;
      },
    );
  }

  async hideApplication(
    studentId: number,
    applicationId: number,
    currentUser: StatusActor,
  ) {
    return withStatusActor(
      this.dataSource,
      currentUser?.userAccountId ?? null,
      async (runner) => {
        const rows = (await runner.query(
          `SELECT application_status
           FROM public.application
           WHERE application_id = $1 AND student_id = $2
           FOR UPDATE`,
          [applicationId, studentId],
        )) as unknown as Array<{ application_status: string }>;
        if (!rows[0]) {
          throw new NotFoundException('Application not found for this student');
        }
        if (
          !['rejected_for_referral', 'closed', 'withdrawn', 'expired'].includes(
            rows[0].application_status,
          )
        ) {
          throw new ConflictException(
            'Only terminal applications can be hidden.',
          );
        }
        await runner.query(
          `INSERT INTO public.application_visibility (
             application_id, student_hidden_at, student_hidden_by_user_account_id
           ) VALUES ($1, CURRENT_TIMESTAMP, $2)
           ON CONFLICT (application_id) DO UPDATE SET
             student_hidden_at = COALESCE(public.application_visibility.student_hidden_at, EXCLUDED.student_hidden_at),
             student_hidden_by_user_account_id = COALESCE(public.application_visibility.student_hidden_by_user_account_id, EXCLUDED.student_hidden_by_user_account_id)`,
          [applicationId, currentUser?.userAccountId],
        );
        return { applicationId, hidden: true };
      },
    );
  }

  async hideAssignment(
    studentId: number,
    assignmentId: number,
    currentUser: StatusActor,
  ) {
    return withStatusActor(
      this.dataSource,
      currentUser?.userAccountId ?? null,
      async (runner) => {
        const rows = (await runner.query(
          `SELECT ia.assignment_status
           FROM public.internship_assignment ia
           JOIN public.referral r ON r.referral_id = ia.referral_id
           JOIN public.application a ON a.application_id = r.application_id
           WHERE ia.internship_assignment_id = $1 AND a.student_id = $2
           FOR UPDATE OF ia`,
          [assignmentId, studentId],
        )) as unknown as Array<{ assignment_status: string }>;
        if (!rows[0]) {
          throw new NotFoundException(
            'Internship assignment not found for this student',
          );
        }
        if (rows[0].assignment_status !== 'finalized') {
          throw new ConflictException(
            'Only finalized assignments can be hidden.',
          );
        }
        await runner.query(
          `INSERT INTO public.internship_assignment_visibility (
             internship_assignment_id, student_hidden_at,
             student_hidden_by_user_account_id
           ) VALUES ($1, CURRENT_TIMESTAMP, $2)
           ON CONFLICT (internship_assignment_id) DO UPDATE SET
             student_hidden_at = COALESCE(public.internship_assignment_visibility.student_hidden_at, EXCLUDED.student_hidden_at),
             student_hidden_by_user_account_id = COALESCE(public.internship_assignment_visibility.student_hidden_by_user_account_id, EXCLUDED.student_hidden_by_user_account_id)`,
          [assignmentId, currentUser?.userAccountId],
        );
        return { assignmentId, hidden: true };
      },
    );
  }

  async getCurrentInternship(studentId: number) {
    const rows = await this.dataSource.query<StudentAssignmentRow[]>(
      `${this.studentAssignmentSelect()}
       WHERE a.student_id = $1
         AND ia.assignment_status <> 'finalized'
         AND ia.deleted_at IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM public.internship_assignment_visibility iav
           WHERE iav.internship_assignment_id = ia.internship_assignment_id
             AND iav.student_hidden_at IS NOT NULL
         )
       ORDER BY ia.created_at DESC, ia.internship_assignment_id DESC`,
      [studentId],
    );

    if (rows.length > 1) {
      throw new ConflictException(
        'Multiple current internship assignments were found. Please contact QC PESO.',
      );
    }

    return rows[0] ? this.mapStudentAssignment(rows[0]) : null;
  }

  async getInternshipHistory(
    studentId: number,
    pagination: { page?: number; limit?: number },
  ) {
    const page = Math.max(1, Number(pagination.page) || 1);
    const limit = Math.max(1, Math.min(15, Number(pagination.limit) || 5));
    const offset = (page - 1) * limit;
    const visibilityClause = `
      a.student_id = $1
      AND ia.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.internship_assignment_visibility iav
        WHERE iav.internship_assignment_id = ia.internship_assignment_id
          AND iav.student_hidden_at IS NOT NULL
      )`;

    const [countRows, rows] = await Promise.all([
      this.dataSource.query<Array<{ total: number | string }>>(
        `SELECT count(*)::integer AS total
         FROM public.internship_assignment ia
         JOIN public.referral r ON r.referral_id = ia.referral_id
         JOIN public.application a ON a.application_id = r.application_id
         WHERE ${visibilityClause}`,
        [studentId],
      ),
      this.dataSource.query<StudentAssignmentRow[]>(
        `${this.studentAssignmentSelect()}
         WHERE ${visibilityClause}
         ORDER BY ia.created_at DESC, ia.internship_assignment_id DESC
         LIMIT $2 OFFSET $3`,
        [studentId, limit, offset],
      ),
    ]);

    const total = Number(countRows[0]?.total ?? 0);
    return {
      data: rows.map((row) => this.mapStudentAssignment(row)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getInternshipHistoryDetail(studentId: number, assignmentId: number) {
    const rows = await this.dataSource.query<StudentAssignmentRow[]>(
      `${this.studentAssignmentSelect()}
       WHERE a.student_id = $1
         AND ia.internship_assignment_id = $2
         AND ia.deleted_at IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM public.internship_assignment_visibility iav
           WHERE iav.internship_assignment_id = ia.internship_assignment_id
             AND iav.student_hidden_at IS NOT NULL
         )`,
      [studentId, assignmentId],
    );
    if (!rows[0]) {
      throw new NotFoundException(
        'Internship assignment not found for this student',
      );
    }
    return this.mapStudentAssignment(rows[0]);
  }

  async withdrawAssignment(
    studentId: number,
    assignmentId: number,
    currentUser: StatusActor,
    dto: StudentAssignmentRemarkDto,
  ) {
    return withStatusActor(
      this.dataSource,
      currentUser.userAccountId ?? null,
      async (runner) => {
        const rows = (await runner.query(
          `SELECT ia.internship_assignment_id, ia.assignment_status
           FROM public.internship_assignment ia
           JOIN public.referral r ON r.referral_id = ia.referral_id
           JOIN public.application a ON a.application_id = r.application_id
           WHERE ia.internship_assignment_id = $1 AND a.student_id = $2
             AND ia.deleted_at IS NULL
           FOR UPDATE OF ia`,
          [assignmentId, studentId],
        )) as Array<{ assignment_status: string }>;
        if (!rows[0]) {
          throw new NotFoundException(
            'Internship assignment not found for this student',
          );
        }
        if (!['pending', 'ongoing'].includes(rows[0].assignment_status)) {
          throw new ConflictException(
            'Only pending or ongoing assignments can be withdrawn.',
          );
        }
        const [updated] = await runner.query(
          `UPDATE public.internship_assignment
           SET assignment_status = 'withdrawn',
               student_withdrawal_remark = $2,
               ended_at = CURRENT_TIMESTAMP,
               end_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::date
           WHERE internship_assignment_id = $1
           RETURNING internship_assignment_id, assignment_status, ended_at,
                     student_withdrawal_remark`,
          [assignmentId, dto.remark.trim()],
        );
        return updated;
      },
    );
  }

  async submitCompanyReview(
    studentId: number,
    assignmentId: number,
    currentUser: StatusActor,
    dto: StudentCompanyReviewDto,
  ) {
    return withStatusActor(
      this.dataSource,
      currentUser.userAccountId ?? null,
      async (runner) => {
        const rows = (await runner.query(
          `SELECT ia.internship_assignment_id, ia.assignment_status
           FROM public.internship_assignment ia
           JOIN public.referral r ON r.referral_id = ia.referral_id
           JOIN public.application a ON a.application_id = r.application_id
           WHERE ia.internship_assignment_id = $1 AND a.student_id = $2
             AND ia.deleted_at IS NULL
           FOR UPDATE OF ia`,
          [assignmentId, studentId],
        )) as Array<{ assignment_status: string }>;
        if (!rows[0]) {
          throw new NotFoundException(
            'Internship assignment not found for this student',
          );
        }
        if (rows[0].assignment_status !== 'complete_company') {
          throw new ConflictException(
            'A Company review may only be submitted after Company completion.',
          );
        }
        const existing = await runner.query(
          `SELECT internship_feedback_id FROM public.internship_feedback
           WHERE internship_assignment_id = $1`,
          [assignmentId],
        );
        if (existing.length > 0) {
          throw new ConflictException(
            'The Company review for this assignment is already final.',
          );
        }
        const [review] = await runner.query(
          `INSERT INTO public.internship_feedback (
             internship_assignment_id, rating, remark
           ) VALUES ($1, $2, $3)
           RETURNING internship_feedback_id, rating, remark, reviewed_at`,
          [assignmentId, dto.rating, dto.remark.trim()],
        );
        await runner.query(
          `UPDATE public.internship_assignment
           SET assignment_status = 'complete_student'
           WHERE internship_assignment_id = $1`,
          [assignmentId],
        );
        return {
          internshipAssignmentId: assignmentId,
          assignmentStatus: 'complete_student',
          review,
        };
      },
    );
  }

  // Accepts physical multipart file upload, saves under backend/uploads/requirements, and persists metadata in DB.
  async uploadRequirementFile(
    studentId: number,
    file: Express.Multer.File,
    dto: StudentRequirementUploadDto,
  ) {
    if (!file) {
      throw new BadRequestException(
        'A file is required for requirement upload',
      );
    }

    const studentExists = await this.studentRepo.findOne({
      where: { studentId },
    });

    if (!studentExists) {
      // Clean up orphaned uploaded file if student does not exist
      if (file.path && existsSync(file.path)) {
        unlinkSync(file.path);
      }
      throw new NotFoundException('Student not found');
    }

    const normalizedType = this.normalizeRequirementType(dto.requirementType);
    const requirementDisplayName =
      dto.requirementName?.trim() || file.originalname;
    const publicRelativePath = `/uploads/requirements/${file.filename}`;

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
        SELECT student_requirement_submission_id, requirement_file_path
        FROM public.student_requirement_submission
        WHERE student_id = $1 AND requirement_type_id = $2
      `,
      [studentId, requirementTypeId],
    );

    let row: any;
    if (existing) {
      const existingPath = String(existing.requirement_file_path ?? '');
      // Remove old file from disk if path starts with /uploads/requirements
      if (existingPath.startsWith('/uploads/requirements/')) {
        const oldFilename = existingPath.replace('/uploads/requirements/', '');
        const oldFullPath = resolve(
          process.cwd(),
          'uploads',
          'requirements',
          oldFilename,
        );
        if (existsSync(oldFullPath)) {
          try {
            unlinkSync(oldFullPath);
          } catch {
            // Ignore error if file already removed
          }
        }
      }

      const updateResult = await this.dataSource.query(
        `
          UPDATE public.student_requirement_submission
          SET requirement_name = $1,
              requirement_file_path = $2,
              updated_at = CURRENT_TIMESTAMP
          WHERE student_requirement_submission_id = $3 AND student_id = $4
          RETURNING *
        `,
        [
          requirementDisplayName,
          publicRelativePath,
          existing.student_requirement_submission_id,
          studentId,
        ],
      );
      row =
        Array.isArray(updateResult) && Array.isArray(updateResult[0])
          ? updateResult[0][0]
          : Array.isArray(updateResult)
            ? updateResult[0]
            : updateResult;
    } else {
      const insertResult = await this.dataSource.query(
        `
          INSERT INTO public.student_requirement_submission (
            student_id,
            requirement_type_id,
            requirement_name,
            requirement_file_path
          ) VALUES ($1, $2, $3, $4)
          RETURNING *
        `,
        [
          studentId,
          requirementTypeId,
          requirementDisplayName,
          publicRelativePath,
        ],
      );
      row = Array.isArray(insertResult) ? insertResult[0] : insertResult;
    }

    return {
      requirementType: normalizedType,
      submission: row,
    };
  }

  async deleteStudentRequirement(studentId: number, requirementType: string) {
    const student = await this.studentRepo.findOne({ where: { studentId } });
    if (!student) throw new NotFoundException('Student not found');

    const normalizedType = this.normalizeRequirementType(requirementType);

    const [submission] = await this.dataSource.query(
      `
        SELECT srs.student_requirement_submission_id, srs.requirement_file_path
        FROM public.student_requirement_submission srs
        JOIN public.requirement_type rt ON rt.requirement_type_id = srs.requirement_type_id
        WHERE srs.student_id = $1 AND lower(rt.requirement_type_name) = lower($2)
      `,
      [studentId, normalizedType],
    );

    if (!submission) {
      throw new NotFoundException('Requirement submission not found');
    }

    const filePath = String(submission.requirement_file_path ?? '');
    if (filePath.startsWith('/uploads/requirements/')) {
      const filename = filePath.replace('/uploads/requirements/', '');
      const fullPath = resolve(
        process.cwd(),
        'uploads',
        'requirements',
        filename,
      );
      if (existsSync(fullPath)) {
        try {
          unlinkSync(fullPath);
        } catch {
          // ignore error if file missing
        }
      }
    }

    await this.dataSource.query(
      `DELETE FROM public.student_requirement_submission WHERE student_requirement_submission_id = $1`,
      [submission.student_requirement_submission_id],
    );

    return { success: true, message: 'Requirement deleted successfully' };
  }

  // Records one immutable clock-in for the current Manila workday.
  async timeInDtr(
    studentId: number,
    dto: { internshipAssignmentId: number },
    now = new Date(),
  ) {
    const today = currentManilaDate(now);
    const timeInValue = this.currentClockTime(now);
    assertValidTime(timeInValue, 'timeIn');

    return this.dataSource.transaction(async (manager) => {
      const [assignment] = await manager.query(
        `SELECT ia.internship_assignment_id, ia.assignment_status,
                ia.start_date::text AS start_date, ia.working_days
         FROM public.internship_assignment ia
         JOIN public.referral r ON r.referral_id = ia.referral_id
         JOIN public.application a ON a.application_id = r.application_id
         WHERE ia.internship_assignment_id = $1 AND a.student_id = $2
           AND ia.deleted_at IS NULL
         FOR UPDATE OF ia`,
        [dto.internshipAssignmentId, studentId],
      );
      if (!assignment) {
        throw new NotFoundException(
          'No internship assignment exists for this student',
        );
      }
      if (assignment.assignment_status !== 'ongoing') {
        throw new ConflictException(
          'Clock In is available only for an ongoing internship.',
        );
      }
      if (today < String(assignment.start_date)) {
        throw new ConflictException('The internship has not started yet.');
      }
      if (!isScheduledWorkday(today, assignment.working_days as number[])) {
        throw new ConflictException('Today is not a selected working day.');
      }
      const existing = await manager.query(
        `SELECT attendance_status, time_in, time_out
         FROM public.attendance_record
         WHERE internship_assignment_id = $1 AND attendance_date = $2::date
         FOR UPDATE`,
        [dto.internshipAssignmentId, today],
      );
      if (existing.length > 0) {
        throw new ConflictException(
          'Attendance for today has already been recorded and cannot be overwritten.',
        );
      }
      const [record] = await manager.query(
        `INSERT INTO public.attendance_record (
           internship_assignment_id, attendance_date, attendance_status,
           time_in, time_out, rendered_minutes
         ) VALUES ($1, $2::date, 'present', $3::time, NULL, 0)
         RETURNING *, attendance_date::text AS attendance_date`,
        [dto.internshipAssignmentId, today, timeInValue],
      );
      return record;
    });
  }

  // Closes the current Manila day's open Present row exactly once.
  async timeOutDtr(
    studentId: number,
    dto: { internshipAssignmentId: number },
    now = new Date(),
  ) {
    const today = currentManilaDate(now);
    const timeOutValue = this.currentClockTime(now);
    assertValidTime(timeOutValue, 'timeOut');

    return this.dataSource.transaction(async (manager) => {
      const [assignment] = await manager.query(
        `SELECT ia.internship_assignment_id, ia.assignment_status
         FROM public.internship_assignment ia
         JOIN public.referral r ON r.referral_id = ia.referral_id
         JOIN public.application a ON a.application_id = r.application_id
         WHERE ia.internship_assignment_id = $1 AND a.student_id = $2
           AND ia.deleted_at IS NULL
         FOR UPDATE OF ia`,
        [dto.internshipAssignmentId, studentId],
      );
      if (!assignment) {
        throw new NotFoundException(
          'No internship assignment exists for this student',
        );
      }
      if (assignment.assignment_status !== 'ongoing') {
        throw new ConflictException(
          'Clock Out is available only for an ongoing internship.',
        );
      }
      const [record] = await manager.query(
        `SELECT attendance_record_id, attendance_status, time_in, time_out
         FROM public.attendance_record
         WHERE internship_assignment_id = $1 AND attendance_date = $2::date
         FOR UPDATE`,
        [dto.internshipAssignmentId, today],
      );
      if (
        !record ||
        record.attendance_status !== 'present' ||
        !record.time_in ||
        record.time_out
      ) {
        throw new ConflictException(
          'Clock Out requires an open Clock In for today.',
        );
      }
      const [updated] = await manager.query(
        `UPDATE public.attendance_record
         SET time_out = $2::time, attendance_status = 'present'
         WHERE attendance_record_id = $1
         RETURNING *, attendance_date::text AS attendance_date`,
        [record.attendance_record_id, timeOutValue],
      );
      return updated;
    });
  }

  async getStudentAttendance(
    studentId: number,
    query?: { startDate?: string; endDate?: string },
  ) {
    const assignmentRows = await this.dataSource.query(
      `
        SELECT 
          ia.internship_assignment_id,
          c.company_id,
          c.company_name,
          o.opportunity_id,
          o.title AS job_title,
          ia.working_days,
          ia.required_minutes,
          ia.start_date::text AS start_date,
          ia.expected_end_date::text AS expected_end_date,
          ia.end_date::text AS end_date,
          ia.start_shift,
          ia.end_shift,
          ia.assignment_status,
          ia.ended_at,
          ia.company_completion_remark,
          ia.company_cancellation_remark,
          ia.student_withdrawal_remark,
          ia.finalized_at,
          COALESCE(ats.total_rendered_minutes, 0::bigint) AS total_rendered_minutes,
          COALESCE(ats.total_rendered_hours, 0::numeric) AS total_rendered_hours,
          COALESCE(ats.present_count, 0::bigint) AS present_count,
          COALESCE(ats.absent_count, 0::bigint) AS absent_count,
          COALESCE(ats.incomplete_count, 0::bigint) AS incomplete_count
        FROM public.internship_assignment ia
        JOIN public.referral r ON r.referral_id = ia.referral_id
        JOIN public.application a ON a.application_id = r.application_id
        JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
        JOIN public.company c ON c.company_id = o.company_id
        LEFT JOIN public.vw_attendance_summary ats ON ats.internship_assignment_id = ia.internship_assignment_id
        WHERE a.student_id = $1
          AND ia.assignment_status <> 'finalized'
          AND ia.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM public.internship_assignment_visibility iav
            WHERE iav.internship_assignment_id = ia.internship_assignment_id
              AND iav.student_hidden_at IS NOT NULL
          )
        ORDER BY ia.created_at DESC, ia.internship_assignment_id DESC
      `,
      [studentId],
    );

    if (assignmentRows.length > 1) {
      throw new ConflictException(
        'Multiple current internship assignments were found. Please contact QC PESO.',
      );
    }

    if (!assignmentRows || assignmentRows.length === 0) {
      return {
        assignment: null,
        today: null,
        records: [],
        summary: {
          daysPresent: 0,
          daysAbsent: 0,
          renderedMinutes: 0,
          remainingMinutes: 0,
        },
      };
    }

    const rawAssignment = assignmentRows[0];
    const totalRendered = Number(rawAssignment.total_rendered_hours || 0);
    const requiredMinutes = Number(rawAssignment.required_minutes || 0);
    const requiredHours = requiredMinutes / 60;
    const totalRenderedMinutes = Number(
      rawAssignment.total_rendered_minutes || 0,
    );
    const remainingMinutes = Math.max(
      0,
      requiredMinutes - totalRenderedMinutes,
    );
    const remainingHours = Number((remainingMinutes / 60).toFixed(2));

    const assignment = {
      internshipAssignmentId: Number(rawAssignment.internship_assignment_id),
      companyId: Number(rawAssignment.company_id),
      companyName: rawAssignment.company_name,
      opportunityId: Number(rawAssignment.opportunity_id),
      jobTitle: rawAssignment.job_title,
      workingDays: rawAssignment.working_days,
      requiredMinutes,
      requiredHours,
      startDate: String(rawAssignment.start_date),
      expectedEndDate: rawAssignment.expected_end_date
        ? String(rawAssignment.expected_end_date)
        : null,
      endDate: rawAssignment.end_date ? String(rawAssignment.end_date) : null,
      endedAt: rawAssignment.ended_at ?? null,
      startShift: rawAssignment.start_shift,
      endShift: rawAssignment.end_shift,
      assignmentStatus: rawAssignment.assignment_status,
      totalRenderedHours: totalRendered,
      totalRenderedMinutes,
      remainingMinutes,
      remainingHours,
    };

    const todayRows = await this.dataSource.query(
      `
        SELECT attendance_record_id, attendance_date::text AS attendance_date,
               attendance_status, time_in, time_out, rendered_minutes
        FROM public.attendance_record
        WHERE internship_assignment_id = $1
          AND attendance_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::date
      `,
      [assignment.internshipAssignmentId],
    );
    const rawToday = todayRows.length > 0 ? todayRows[0] : null;
    const today = rawToday
      ? {
          attendanceRecordId: Number(rawToday.attendance_record_id),
          date: String(rawToday.attendance_date),
          attendanceStatus: rawToday.attendance_status,
          timeIn: rawToday.time_in,
          timeOut: rawToday.time_out,
          renderedMinutes: Number(rawToday.rendered_minutes),
        }
      : null;

    const whereConditions = ['internship_assignment_id = $1'];
    const queryParams: any[] = [assignment.internshipAssignmentId];
    let pIdx = 2;
    if (query?.startDate) {
      whereConditions.push(`attendance_date >= $${pIdx}`);
      queryParams.push(query.startDate);
      pIdx++;
    }
    if (query?.endDate) {
      whereConditions.push(`attendance_date <= $${pIdx}`);
      queryParams.push(query.endDate);
      pIdx++;
    }

    const recordsRows = await this.dataSource.query<
      Array<{
        attendance_record_id: number | string;
        attendance_date: string;
        attendance_status: 'present' | 'absent' | 'incomplete';
        time_in: string | null;
        time_out: string | null;
        rendered_minutes: number | string;
      }>
    >(
      `
        SELECT attendance_record_id, attendance_date::text AS attendance_date,
               attendance_status, time_in, time_out, rendered_minutes
        FROM public.attendance_record
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY attendance_date DESC
      `,
      queryParams,
    );

    const records = recordsRows.map((row) => ({
      attendanceRecordId: Number(row.attendance_record_id),
      date: String(row.attendance_date),
      status: row.attendance_status,
      timeIn: row.time_in,
      timeOut: row.time_out,
      renderedMinutes: Number(row.rendered_minutes || 0),
    }));

    return {
      assignment,
      today,
      records,
      summary: {
        daysPresent: Number(rawAssignment.present_count),
        daysAbsent: Number(rawAssignment.absent_count),
        renderedMinutes: totalRenderedMinutes,
        remainingMinutes,
      },
    };
  }

  async getStudentAttendanceHistory(
    studentId: number,
    assignmentId: number,
    query: StudentAttendanceHistoryQueryDto,
  ) {
    const [assignment] = await this.dataSource.query(
      `SELECT ia.internship_assignment_id, ia.assignment_status,
              ia.required_minutes, ia.start_date::text AS start_date,
              ia.expected_end_date::text AS expected_end_date, ia.ended_at,
              ia.working_days, ia.start_shift, ia.end_shift,
              o.title AS job_title, c.company_name,
              COALESCE(ats.total_rendered_minutes, 0::bigint) AS rendered_minutes,
              COALESCE(ats.present_count, 0::bigint) AS days_present,
              COALESCE(ats.absent_count, 0::bigint) AS days_absent
       FROM public.internship_assignment ia
       JOIN public.referral r ON r.referral_id = ia.referral_id
       JOIN public.application a ON a.application_id = r.application_id
       JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
       JOIN public.company c ON c.company_id = o.company_id
       LEFT JOIN public.vw_attendance_summary ats
         ON ats.internship_assignment_id = ia.internship_assignment_id
       WHERE ia.internship_assignment_id = $1 AND a.student_id = $2
         AND ia.deleted_at IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM public.internship_assignment_visibility iav
           WHERE iav.internship_assignment_id = ia.internship_assignment_id
             AND iav.student_hidden_at IS NOT NULL
         )`,
      [assignmentId, studentId],
    );
    if (!assignment) {
      throw new NotFoundException(
        'Internship assignment not found for this student',
      );
    }

    const limit = [5, 10, 15].includes(query.limit) ? query.limit : 5;
    const page = Math.max(1, query.page || 1);
    const params: unknown[] = [assignmentId];
    const conditions = ['ar.internship_assignment_id = $1'];
    if (query.status) {
      params.push(query.status);
      conditions.push(`ar.attendance_status = $${params.length}`);
    }
    if (query.date) {
      assertValidDate(query.date, 'date');
      params.push(query.date);
      conditions.push(`ar.attendance_date = $${params.length}::date`);
    }
    const [{ total }] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS total FROM public.attendance_record ar
       WHERE ${conditions.join(' AND ')}`,
      params,
    );
    params.push(limit, (page - 1) * limit);
    const records = await this.dataSource.query(
      `SELECT ar.attendance_record_id AS "attendanceRecordId",
              ar.attendance_date::text AS date,
              ar.time_in AS "timeIn", ar.time_out AS "timeOut",
              ar.rendered_minutes AS "renderedMinutes",
              ar.attendance_status AS status
       FROM public.attendance_record ar
       WHERE ${conditions.join(' AND ')}
       ORDER BY ar.attendance_date DESC, ar.attendance_record_id DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    const requiredMinutes = Number(assignment.required_minutes);
    const renderedMinutes = Number(assignment.rendered_minutes);
    return {
      assignment: {
        internshipAssignmentId: Number(assignment.internship_assignment_id),
        companyName: assignment.company_name,
        jobTitle: assignment.job_title,
        assignmentStatus: assignment.assignment_status,
        requiredMinutes,
        startDate: assignment.start_date,
        expectedEndDate: assignment.expected_end_date,
        endedAt: assignment.ended_at,
        workingDays: assignment.working_days,
        startShift: assignment.start_shift,
        endShift: assignment.end_shift,
      },
      summary: {
        daysPresent: Number(assignment.days_present),
        daysAbsent: Number(assignment.days_absent),
        renderedMinutes,
        remainingMinutes: Math.max(requiredMinutes - renderedMinutes, 0),
      },
      records,
      meta: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
      },
    };
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
      resume: 'curriculum_vitae_resume',
      'letter of intent': 'letter_of_intent',
      'letter-of-intent': 'letter_of_intent',
      'recommendation letter': 'recommendation_letter',
      'recommendation-letter': 'recommendation_letter',
    };

    const normalized = (value ?? '').trim().toLowerCase().replace(/\s+/g, '_');
    return map[normalized] ?? normalized;
  }

  private studentAssignmentSelect(): string {
    return `
      SELECT
        ia.internship_assignment_id,
        concat_ws(' ', s.first_name, s.middle_name, s.last_name, s.extension_name) AS student_full_name,
        s.contact_email AS student_contact_email,
        s.contact_number AS student_contact_number,
        concat_ws(', ', NULLIF(s.address_line, ''), NULLIF(s.address_barangay, ''), NULLIF(s.address_city, '')) AS student_address,
        s.photo_file_path AS student_photo_file_path,
        s.updated_at AS student_profile_updated_at,
        sai.strand_program,
        sai.year_level,
        sai.school_name,
        c.company_id,
        c.company_name,
        c.logo_file_path AS company_logo_file_path,
        o.opportunity_id,
        o.title AS job_title,
        ia.working_days,
        ia.required_minutes,
        COALESCE(ats.total_rendered_minutes, 0::bigint) AS total_rendered_minutes,
        ia.start_date::text AS start_date,
        ia.expected_end_date::text AS expected_end_date,
        ia.end_date::text AS end_date,
        ia.ended_at,
        ia.start_shift,
        ia.end_shift,
        ia.assignment_status,
        ia.company_completion_remark,
        ia.company_cancellation_remark,
        ia.student_withdrawal_remark,
        f.rating AS review_rating,
        f.remark AS review_remark,
        f.reviewed_at,
        ia.created_at
      FROM public.internship_assignment ia
      JOIN public.referral r ON r.referral_id = ia.referral_id
      JOIN public.application a ON a.application_id = r.application_id
      JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
      JOIN public.company c ON c.company_id = o.company_id
      JOIN public.student s ON s.student_id = a.student_id
      LEFT JOIN public.student_academic_information sai ON sai.student_id = s.student_id
      LEFT JOIN public.vw_attendance_summary ats
        ON ats.internship_assignment_id = ia.internship_assignment_id
      LEFT JOIN public.internship_feedback f
        ON f.internship_assignment_id = ia.internship_assignment_id`;
  }

  private mapStudentAssignment(row: StudentAssignmentRow) {
    const requiredMinutes = Number(row.required_minutes);
    const renderedMinutes = Number(row.total_rendered_minutes ?? 0);
    const remainingMinutes = Math.max(0, requiredMinutes - renderedMinutes);
    return {
      internshipAssignmentId: Number(row.internship_assignment_id),
      studentFullName: row.student_full_name,
      studentContactEmail: row.student_contact_email,
      studentContactNumber: row.student_contact_number,
      studentAddress: row.student_address,
      studentPhotoFilePath: row.student_photo_file_path,
      studentProfileUpdatedAt: row.student_profile_updated_at,
      strandProgram: row.strand_program,
      yearLevel: row.year_level,
      schoolName: row.school_name,
      companyId: Number(row.company_id),
      companyName: row.company_name,
      companyLogoFilePath: row.company_logo_file_path,
      opportunityId: Number(row.opportunity_id),
      jobTitle: row.job_title,
      workingDays: row.working_days.map(Number),
      requiredMinutes,
      renderedMinutes,
      remainingMinutes,
      requiredHours: requiredMinutes / 60,
      renderedHours: Number((renderedMinutes / 60).toFixed(2)),
      remainingHours: Number((remainingMinutes / 60).toFixed(2)),
      startDate: row.start_date,
      expectedEndDate: row.expected_end_date,
      endDate: row.end_date,
      endedAt: row.ended_at,
      startShift: row.start_shift,
      endShift: row.end_shift,
      assignmentStatus: row.assignment_status,
      companyCompletionRemark: row.company_completion_remark,
      companyCancellationRemark: row.company_cancellation_remark,
      studentWithdrawalRemark: row.student_withdrawal_remark,
      studentReview:
        row.review_rating === null
          ? null
          : {
              rating: Number(row.review_rating),
              remark: row.review_remark,
              reviewedAt: row.reviewed_at,
            },
      createdAt: row.created_at,
    };
  }

  private async validateAssignmentForStudent(
    studentId: number,
    assignmentId: number,
  ) {
    const [assignment] = await this.dataSource.query(
      `
        SELECT ia.*
        FROM public.internship_assignment ia
        JOIN public.referral r ON r.referral_id = ia.referral_id
        JOIN public.application a ON a.application_id = r.application_id
        WHERE ia.internship_assignment_id = $1 AND a.student_id = $2
          AND ia.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM public.internship_assignment_visibility iav
            WHERE iav.internship_assignment_id = ia.internship_assignment_id
              AND iav.student_hidden_at IS NOT NULL
          )
      `,
      [assignmentId, studentId],
    );

    if (!assignment) {
      throw new NotFoundException(
        'No internship assignment exists for this student',
      );
    }

    return assignment;
  }

  private currentClockTime(now = new Date()) {
    return currentManilaTime(now);
  }
}
