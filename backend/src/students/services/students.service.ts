import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { existsSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { Student } from '../entities/student.entity';
import {
  CreateStudentApplicationDto,
  StudentApplicationResponseDto,
  StudentProfileUpdateDto,
  StudentRequirementUploadDto,
} from '../dto/students.dto';
import { withStatusActor } from '../../database/status-actor.transaction';


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

  async createStudentApplication(
    studentId: number,
    dto: CreateStudentApplicationDto,
    currentUser: any,
  ) {
    const student = await this.studentRepo.findOne({ where: { studentId } });
    if (!student) {
      throw new NotFoundException('Student not found');
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

    if (!academic || !academic.school_name || !academic.year_level || !academic.strand_program) {
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

    // Check opportunity status and deadline
    const [opportunity] = await this.dataSource.query(
      `
        SELECT opportunity_id, title, opportunity_status, application_deadline
        FROM public.opportunity
        WHERE opportunity_id = $1
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

    if (new Date(opportunity.application_deadline) <= new Date()) {
      throw new BadRequestException(
        'The application deadline for this opportunity has already passed',
      );
    }

    // Check for existing active application
    const [existingActive] = await this.dataSource.query(
      `
        SELECT application_id, application_status
        FROM public.application
        WHERE student_id = $1
          AND opportunity_id = $2
          AND application_status IN ('submitted', 'under_review', 'approved_for_referral')
      `,
      [studentId, dto.opportunityId],
    );

    if (existingActive) {
      throw new BadRequestException(
        `You already have an active application (ID: ${existingActive.application_id}, Status: ${existingActive.application_status}) for this opportunity`,
      );
    }

    const [created] = await this.dataSource.query(
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
          ad.referral_id AS "referralId",
          ad.referral_status AS "referralStatus",
          ad.company_response AS "companyResponse",
          ad.internship_assignment_id AS "internshipAssignmentId",
          ad.assignment_status AS "assignmentStatus"
        FROM public.vw_application_details ad
        WHERE ad.student_id = $1
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
          ad.referral_id,
          ad.referral_status,
          ad.company_response,
          ad.internship_assignment_id,
          ad.assignment_status
        FROM public.vw_application_details ad
        WHERE ad.application_id = $1 AND ad.student_id = $2
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
            iv.remark
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
      },
      referral: detail.referral_id
        ? {
            referralId: detail.referral_id,
            referralStatus: detail.referral_status,
            companyResponse: detail.company_response,
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
    };
  }

  async respondToApplicationOffer(
    studentId: number,
    applicationId: number,
    dto: StudentApplicationResponseDto,
    currentUser: any,
  ) {
    const [application] = await this.dataSource.query(
      `
        SELECT a.application_id, a.student_id, a.application_status, a.student_response
        FROM public.application a
        WHERE a.application_id = $1 AND a.student_id = $2
      `,
      [applicationId, studentId],
    );

    if (!application) {
      throw new NotFoundException('Application not found for this student');
    }

    if (application.student_response !== 'pending') {
      throw new BadRequestException(
        `Student has already responded to this application (${application.student_response})`,
      );
    }

    const [referral] = await this.dataSource.query(
      `
        SELECT referral_id, referral_status, company_response
        FROM public.referral
        WHERE application_id = $1
      `,
      [applicationId],
    );

    if (!referral || referral.company_response !== 'accepted') {
      throw new BadRequestException(
        'A student may respond only after company acceptance of referral',
      );
    }

    return withStatusActor(
      this.dataSource,
      currentUser?.userAccountId ?? null,
      async (runner) => {
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
        return updated;
      },
    );
  }

  async withdrawApplication(
    studentId: number,
    applicationId: number,
    currentUser: any,
  ) {
    const [application] = await this.dataSource.query(
      `
        SELECT a.application_id, a.student_id, a.application_status
        FROM public.application a
        WHERE a.application_id = $1 AND a.student_id = $2
      `,
      [applicationId, studentId],
    );

    if (!application) {
      throw new NotFoundException('Application not found for this student');
    }

    if (
      !['submitted', 'under_review', 'approved_for_referral'].includes(
        application.application_status,
      )
    ) {
      throw new BadRequestException(
        `Cannot withdraw an application with status: ${application.application_status}`,
      );
    }

    return withStatusActor(
      this.dataSource,
      currentUser?.userAccountId ?? null,
      async (runner) => {
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
      const fullPath = resolve(process.cwd(), 'uploads', 'requirements', filename);
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

  // Records the assignment clock-in for the current day and validates the assignment ownership.
  async timeInDtr(
    studentId: number,
    dto: { internshipAssignmentId: number; timeIn?: string },
  ) {
    const assignment = await this.validateAssignmentForStudent(
      studentId,
      dto.internshipAssignmentId,
    );
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
      [
        assignment.internship_assignment_id,
        timeInValue,
        this.resolveTimeInStatus(timeInValue),
      ],
    );

    return record;
  }

  // Closes the same day attendance row and computes the rendered hours from the in/out timestamps.
  async timeOutDtr(
    studentId: number,
    dto: { internshipAssignmentId: number; timeOut?: string },
  ) {
    const assignment = await this.validateAssignmentForStudent(
      studentId,
      dto.internshipAssignmentId,
    );
    const [record] = await this.dataSource.query(
      `
        SELECT *
        FROM public.attendance_record
        WHERE internship_assignment_id = $1 AND attendance_date = CURRENT_DATE
      `,
      [assignment.internship_assignment_id],
    );

    if (!record) {
      throw new UnprocessableEntityException(
        'A time-in entry is required before time-out',
      );
    }

    const timeOutValue = dto.timeOut ?? this.currentClockTime();
    const hoursRendered = this.calculateHoursRendered(
      String(record.time_in),
      timeOutValue,
    );

    const result = await this.dataSource.query(
      `
        UPDATE public.attendance_record
        SET time_out = $2,
            hours_rendered = $3,
            rendered_hours_status = $4,
            updated_at = CURRENT_TIMESTAMP
        WHERE attendance_record_id = $1
        RETURNING *
      `,
      [
        record.attendance_record_id,
        timeOutValue,
        hoursRendered,
        hoursRendered > 0 ? 'complete' : 'incomplete',
      ],
    );

    const updated =
      Array.isArray(result) && Array.isArray(result[0])
        ? result[0][0]
        : Array.isArray(result)
          ? result[0]
          : result;

    return updated;
  }

  async getStudentAttendance(
    studentId: number,
    query?: { startDate?: string; endDate?: string },
  ) {
    // 1. Fetch current or latest assignment for the student
    const assignmentRows = await this.dataSource.query(
      `
        SELECT 
          ia.internship_assignment_id,
          c.company_id,
          c.company_name,
          o.opportunity_id,
          o.title AS job_title,
          ia.working_days,
          ia.required_hours,
          ia.start_date,
          ia.expected_end_date,
          ia.end_date,
          ia.start_shift,
          ia.end_shift,
          ia.assignment_status,
          COALESCE(ats.total_rendered_hours, 0::numeric) AS total_rendered_hours
        FROM public.internship_assignment ia
        JOIN public.referral r ON r.referral_id = ia.referral_id
        JOIN public.application a ON a.application_id = r.application_id
        JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
        JOIN public.company c ON c.company_id = o.company_id
        LEFT JOIN public.vw_attendance_summary ats ON ats.internship_assignment_id = ia.internship_assignment_id
        WHERE a.student_id = $1
        ORDER BY 
          CASE WHEN ia.assignment_status = 'ongoing' THEN 1 
               WHEN ia.assignment_status = 'pending' THEN 2 
               ELSE 3 END,
          ia.created_at DESC
        LIMIT 1
      `,
      [studentId],
    );

    if (!assignmentRows || assignmentRows.length === 0) {
      return {
        assignment: null,
        today: null,
        records: [],
        summary: {
          daysPresent: 0,
          absences: 0,
          lateArrivals: 0,
          attendanceRate: 0,
          totalRenderedHours: 0,
        },
      };
    }

    const rawAssignment = assignmentRows[0];
    const totalRendered = Number(rawAssignment.total_rendered_hours || 0);
    const requiredHours = Number(rawAssignment.required_hours || 0);
    const remainingHours = Math.max(0, requiredHours - totalRendered);

    const assignment = {
      internshipAssignmentId: Number(rawAssignment.internship_assignment_id),
      companyId: Number(rawAssignment.company_id),
      companyName: rawAssignment.company_name,
      opportunityId: Number(rawAssignment.opportunity_id),
      jobTitle: rawAssignment.job_title,
      workingDays: rawAssignment.working_days,
      requiredHours,
      startDate: rawAssignment.start_date instanceof Date ? rawAssignment.start_date.toISOString().split('T')[0] : String(rawAssignment.start_date),
      expectedEndDate: rawAssignment.expected_end_date ? (rawAssignment.expected_end_date instanceof Date ? rawAssignment.expected_end_date.toISOString().split('T')[0] : String(rawAssignment.expected_end_date)) : null,
      endDate: rawAssignment.end_date ? (rawAssignment.end_date instanceof Date ? rawAssignment.end_date.toISOString().split('T')[0] : String(rawAssignment.end_date)) : null,
      startShift: rawAssignment.start_shift,
      endShift: rawAssignment.end_shift,
      assignmentStatus: rawAssignment.assignment_status,
      totalRenderedHours: totalRendered,
      remainingHours,
    };

    // 2. Fetch today's record
    const todayRows = await this.dataSource.query(
      `
        SELECT *
        FROM public.attendance_record
        WHERE internship_assignment_id = $1 AND attendance_date = CURRENT_DATE
      `,
      [assignment.internshipAssignmentId],
    );
    const today = todayRows.length > 0 ? todayRows[0] : null;

    // 3. Fetch records within query range or default
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

    const recordsRows = await this.dataSource.query(
      `
        SELECT *
        FROM public.attendance_record
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY attendance_date DESC
      `,
      queryParams,
    );

    const records = recordsRows.map((row: any) => ({
      attendanceRecordId: Number(row.attendance_record_id),
      date: row.attendance_date instanceof Date ? row.attendance_date.toISOString().split('T')[0] : String(row.attendance_date),
      status: row.time_in_status === 'late' ? 'late' : 'present',
      timeIn: row.time_in,
      timeOut: row.time_out,
      renderedHours: Number(row.hours_rendered || 0),
      renderedHoursStatus: row.rendered_hours_status,
    }));

    // 4. Fetch summary from view
    const summaryRows = await this.dataSource.query(
      `
        SELECT *
        FROM public.vw_attendance_summary
        WHERE internship_assignment_id = $1
      `,
      [assignment.internshipAssignmentId],
    );

    const summaryRow = summaryRows[0] || {};
    const daysPresent = Number(summaryRow.attendance_record_count || 0);
    const lateArrivals = Number(summaryRow.late_count || 0);
    const absences = 0; // Schema does not record absent rows directly
    const attendanceRate = daysPresent > 0 ? Math.round(((daysPresent - lateArrivals) / daysPresent) * 100) : 100;

    return {
      assignment,
      today,
      records,
      summary: {
        daysPresent,
        absences,
        lateArrivals,
        attendanceRate,
        totalRenderedHours: Number(summaryRow.total_rendered_hours || totalRendered),
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
