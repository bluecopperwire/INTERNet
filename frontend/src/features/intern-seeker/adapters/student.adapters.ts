import { publicUploadUrl } from '../../../utils/public-upload-url';
import { API_BASE_URL } from '../../../services/api';
import type {
  StudentProfileResponse,
  OpportunitySummaryDto,
  StudentApplicationDto,
  StudentApplicationStatusDto,
  StudentRequirementsResponse,
  StudentAttendanceResponse,
} from '../../../types/api';
import type {
  InternshipOpportunity,
  UserProfile,
} from '../types/internship.types';
import type {
  UserApplication,
  ApplicationProgress,
  ApplicationDisplayStatus,
} from '../types/application.types';
import type {
  InternshipRequirement,
  RequirementDocument,
} from '../types/requirement.types';
import type {
  InternshipDetails,
  TodayAttendance,
  AttendanceRecord,
  AttendanceSummary,
} from '../types/attendance.types';

export function adaptOpportunity(
  dto: OpportunitySummaryDto,
): InternshipOpportunity {
  const workSetupMap: Record<string, 'On-site' | 'Remote' | 'Hybrid'> = {
    onsite: 'On-site',
    remote: 'Remote',
    hybrid: 'Hybrid',
  };

  const allowanceStr =
    dto.allowance === null ? 'No Allowance' : String(dto.allowance);

  return {
    id: String(dto.opportunityId),
    companyId: String(dto.companyId),
    companyName: dto.companyName,
    companyLogoUrl: publicUploadUrl(
      dto.companyLogoFilePath,
      dto.companyProfileUpdatedAt,
    ),
    position: dto.title,
    location: dto.companyAddressCity || 'Quezon City',
    workSetup: workSetupMap[dto.workArrangement] || 'On-site',
    postedAt: new Date(dto.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    tags: [dto.industryName, workSetupMap[dto.workArrangement] || 'On-site'],
    isApplied: dto.hasApplied,
    isExclusive: dto.companyType === 'government',
    details: {
      workplace: dto.companyAddressCity || 'Quezon City',
      department: dto.department,
      internshipDuration: `${dto.minimumRequiredHours} Hours`,
      numberOfSlots: dto.offeredSlots,
      applicationDeadline: dto.applicationDeadline,
      description: dto.description,
      qualifications: dto.qualification || 'No specific qualification listed.',
      allowance: allowanceStr,
    },
  };
}

const YEAR_LEVEL_MAP_TO_UI: Record<string, string> = {
  grade_11: 'Grade 11',
  grade_12: 'Grade 12',
  first_year_college: '1st Year',
  second_year_college: '2nd Year',
  third_year_college: '3rd Year',
  fourth_year_college: '4th Year',
  'Grade 11': 'Grade 11',
  'Grade 12': 'Grade 12',
  '1st Year': '1st Year',
  '2nd Year': '2nd Year',
  '3rd Year': '3rd Year',
  '4th Year': '4th Year',
};

const YEAR_LEVEL_MAP_TO_DTO: Record<string, string> = {
  'Grade 11': 'grade_11',
  'Grade 12': 'grade_12',
  '1st Year': 'first_year_college',
  '2nd Year': 'second_year_college',
  '3rd Year': 'third_year_college',
  '4th Year': 'fourth_year_college',
  grade_11: 'grade_11',
  grade_12: 'grade_12',
  first_year_college: 'first_year_college',
  second_year_college: 'second_year_college',
  third_year_college: 'third_year_college',
  fourth_year_college: 'fourth_year_college',
};

const SCHEDULE_MAP_TO_UI: Record<string, string> = {
  weekdays: 'Weekdays',
  weekends: 'Weekends',
  flexible: 'Flexible',
  Weekdays: 'Weekdays',
  Weekends: 'Weekends',
  Flexible: 'Flexible',
};

const SCHEDULE_MAP_TO_DTO: Record<string, string> = {
  Weekdays: 'weekdays',
  Weekends: 'weekends',
  Flexible: 'flexible',
  weekdays: 'weekdays',
  weekends: 'weekends',
  flexible: 'flexible',
};

const HOST_ORG_MAP_TO_UI: Record<string, string> = {
  government: 'Government',
  private: 'Private',
  Government: 'Government',
  Private: 'Private',
};

const HOST_ORG_MAP_TO_DTO: Record<string, string> = {
  Government: 'government',
  Private: 'private',
  government: 'government',
  private: 'private',
};

const SEX_MAP_TO_UI: Record<string, string> = {
  female: 'Female',
  male: 'Male',
  Female: 'Female',
  Male: 'Male',
};

const SEX_MAP_TO_DTO: Record<string, string> = {
  Female: 'female',
  Male: 'male',
  female: 'female',
  male: 'male',
};

export function adaptStudentProfile(dto: StudentProfileResponse): UserProfile {
  const s = dto.student;
  const ac = dto.academic;
  const ip = dto.internshipPreference;
  const pi = dto.preferredIndustries || [];

  const rawYear = ac?.year_level || '';
  const uiYear = YEAR_LEVEL_MAP_TO_UI[rawYear] || rawYear;

  const rawSchedule = ip?.available_days || '';
  const uiSchedule = rawSchedule
    ? SCHEDULE_MAP_TO_UI[rawSchedule] || rawSchedule
    : '';

  const rawHostOrg = ip?.preferred_company_type || '';
  const uiHostOrg = rawHostOrg
    ? HOST_ORG_MAP_TO_UI[rawHostOrg] || rawHostOrg
    : '';

  const birthDateStr = s.birth_date ? String(s.birth_date).split('T')[0] : '';
  const startDateStr = ip?.start_date
    ? String(ip.start_date).split('T')[0]
    : '';
  const photoUrl = publicUploadUrl(s.photo_file_path, s.updated_at);

  return {
    id: String(s.student_id),
    firstName: s.first_name || '',
    middleName: s.middle_name || '',
    lastName: s.last_name || '',
    extensionName: s.extension_name || '',
    role: 'Intern Seeker',
    location: `${s.address_barangay || ''}, ${s.address_city || ''}`.replace(
      /^, |, $/g,
      '',
    ),
    email: s.contact_email || '',
    linkedinUrl: s.linkedin_url || '',
    internshipStatus: 'Not Employed',
    sex: SEX_MAP_TO_UI[s.sex] || s.sex || '',
    birthdate: birthDateStr,
    contactNumber: s.contact_number || '',
    address: {
      street: s.address_line || '',
      barangay: s.address_barangay || '',
      district: s.address_district || 'N/A',
      city: s.address_city || '',
    },
    inquiryVia: s.inquiry_method || 'online',
    photoUrl,
    academic: {
      schoolName: ac?.school_name || '',
      program: ac?.strand_program || '',
      yearLevel: uiYear,
    },
    preferences: {
      requiredHours: ip?.required_hours ?? '',
      willingToAssignOutside:
        ip?.allows_outside_preferred_field === true
          ? true
          : ip?.allows_outside_preferred_field === false
            ? false
            : null,
      preferredIndustries: pi.map(
        (p) =>
          (p.custom_industry_name ? 'Other' : p.industry_name) ||
          String(p.industry_id || ''),
      ),
      otherPreferredField:
        pi.find((p) => p.custom_industry_name)?.custom_industry_name || '',
      schedule: uiSchedule ? [uiSchedule] : [],
      startDate: startDateStr,
      hostOrgType: uiHostOrg,
    },
  };
}

export function adaptStudentProfileToUpdateDto(
  profile: Partial<UserProfile>,
  referenceIndustries: Array<{
    industryId: number;
    industryName: string;
    isCustomText?: boolean;
  }> = [],
) {
  const normYear =
    YEAR_LEVEL_MAP_TO_DTO[profile.academic?.yearLevel || ''] || '';
  const normSchedule =
    SCHEDULE_MAP_TO_DTO[profile.preferences?.schedule?.[0] || ''] || '';
  const normOrgType =
    HOST_ORG_MAP_TO_DTO[profile.preferences?.hostOrgType || ''] || '';

  const birthDateValue =
    profile.birthdate && profile.birthdate.trim()
      ? profile.birthdate.split('T')[0]
      : '2002-01-01';

  const startDateValue =
    profile.preferences?.startDate && profile.preferences.startDate.trim()
      ? profile.preferences.startDate.split('T')[0]
      : '';

  const preferredIndustriesDto: Array<{
    industryId: number;
    customIndustryName?: string;
  }> = [];
  const selectedIndustryNames = profile.preferences?.preferredIndustries || [];

  selectedIndustryNames.forEach((name) => {
    if (name === 'Other') {
      const customName = profile.preferences?.otherPreferredField?.trim();
      const customInd = referenceIndustries.find(
        (i) => i.isCustomText || i.industryName.toLowerCase() === 'other',
      );
      if (customInd) {
        preferredIndustriesDto.push({
          industryId: customInd.industryId,
          customIndustryName: customName || undefined,
        });
      }
      return;
    }

    const matched = referenceIndustries.find(
      (ind) =>
        ind.industryName.toLowerCase().replace(/[^a-z0-9]/g, '') ===
        name.toLowerCase().replace(/[^a-z0-9]/g, ''),
    );
    if (matched) {
      preferredIndustriesDto.push({ industryId: matched.industryId });
    }
  });

  const allowedInquiries = ['walk_in', 'online', 'phone_call', 'school'];
  const inquiryMethod =
    profile.inquiryVia && allowedInquiries.includes(profile.inquiryVia)
      ? profile.inquiryVia
      : 'online';

  return {
    firstName: profile.firstName || '',
    middleName: profile.middleName || undefined,
    lastName: profile.lastName || '',
    extensionName: profile.extensionName || undefined,
    sex: SEX_MAP_TO_DTO[profile.sex || ''] || profile.sex || '',
    birthDate: birthDateValue,
    contactNumber: profile.contactNumber || '',
    contactEmail: profile.email || '',
    linkedinUrl: profile.linkedinUrl || undefined,
    addressLine: profile.address?.street || '',
    addressBarangay: profile.address?.barangay || '',
    addressDistrict: profile.address?.district || 'N/A',
    addressCity: profile.address?.city || '',
    inquiryMethod,
    academic: {
      schoolName: profile.academic?.schoolName || '',
      strandProgram: profile.academic?.program || '',
      yearLevel: normYear,
    },
    internshipPreference: {
      requiredHours: Number(profile.preferences?.requiredHours),
      availableDays: normSchedule,
      preferredCompanyType: normOrgType,
      startDate: startDateValue,
      allowsOutsidePreferredField:
        profile.preferences?.willingToAssignOutside ?? null,
    },
    preferredIndustries: preferredIndustriesDto,
  };
}

export function adaptApplicationDisplayStatus(
  app: StudentApplicationDto | StudentApplicationStatusDto,
): ApplicationDisplayStatus {
  if (app.applicationStatus === 'withdrawn') return 'Withdrawn';
  if (app.applicationStatus === 'rejected_for_referral') return 'Rejected';

  if (app.referral) {
    if (app.referral.companyResponse === 'accepted') return 'Accepted';
    if (app.referral.companyResponse === 'rejected') return 'Rejected';
    if (app.referral.companyResponse === 'for_interview')
      return 'Interview Scheduled';
    return 'Endorsed to Company';
  }

  if (app.applicationStatus === 'approved_for_referral')
    return 'Endorsed to Company';
  return 'For Review (QC PESO)';
}

export function buildApplicationTimeline(
  app: StudentApplicationStatusDto,
): ApplicationProgress[] {
  const steps: ApplicationProgress[] = [];

  // Stage 1: Submission
  steps.push({
    stage: 'Application Submission',
    state: 'completed',
    message: 'Application received and submitted successfully',
    timestamp: new Date(app.submittedAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
  });

  // Stage 2: QC PESO Endorsement
  if (app.applicationStatus === 'rejected_for_referral') {
    steps.push({
      stage: 'QC PESO Endorsement',
      state: 'rejected',
      message: 'Application was not approved for referral',
      remark: app.remark || undefined,
    });
    return steps;
  }

  if (app.referral || app.applicationStatus === 'approved_for_referral') {
    steps.push({
      stage: 'QC PESO Endorsement',
      state: 'completed',
      message: 'Endorsed to partner employer',
    });
  } else {
    steps.push({
      stage: 'QC PESO Endorsement',
      state: 'current',
      message: 'Under review by QC PESO Officers',
    });
    return steps;
  }

  // Stage 3: Company Review & Interview
  if (app.referral) {
    if (app.referral.companyResponse === 'rejected') {
      steps.push({
        stage: 'Company Review',
        state: 'rejected',
        message: 'Application declined by partner company',
      });
      return steps;
    }

    if (app.interview) {
      steps.push({
        stage: 'Company Review',
        state: 'completed',
        message: 'Interview completed or scheduled',
        interview: {
          date: new Date(app.interview.scheduled_at).toLocaleDateString(),
          time: new Date(app.interview.scheduled_at).toLocaleTimeString(),
          mode:
            app.interview.interview_mode === 'online' ? 'online' : 'in-person',
          meetingUrl: app.interview.online_meeting_url || undefined,
          location: app.interview.physical_location || undefined,
          remark: app.interview.remark || undefined,
        },
      });
    } else if (app.referral.companyResponse === 'for_interview') {
      steps.push({
        stage: 'Company Review',
        state: 'interview-scheduled',
        message: 'Interview invitation sent by company',
      });
    } else {
      steps.push({
        stage: 'Company Review',
        state:
          app.referral.companyResponse === 'accepted' ? 'completed' : 'current',
        message: 'Partner company is reviewing your qualifications',
      });
    }
  }

  // Stage 4: Company Decision
  if (app.referral?.companyResponse === 'accepted') {
    steps.push({
      stage: 'Company Decision',
      state: 'completed',
      message: 'Official internship offer extended',
    });

    // Stage 5: Student Decision
    if (app.studentResponse === 'accepted') {
      steps.push({
        stage: 'Student Decision',
        state: 'completed',
        message: 'Offer accepted! Internship assignment confirmed.',
        timestamp: app.studentRespondedAt
          ? new Date(app.studentRespondedAt).toLocaleDateString()
          : undefined,
      });
    } else if (app.studentResponse === 'declined') {
      steps.push({
        stage: 'Student Decision',
        state: 'rejected',
        message: 'Offer declined by applicant.',
        timestamp: app.studentRespondedAt
          ? new Date(app.studentRespondedAt).toLocaleDateString()
          : undefined,
      });
    } else {
      steps.push({
        stage: 'Student Decision',
        state: 'current',
        message: 'Awaiting your response to accept or decline the offer.',
      });
    }
  }

  return steps;
}

export function adaptApplication(
  dto: StudentApplicationDto,
  statusDetail?: StudentApplicationStatusDto,
): UserApplication {
  const displayStatus = adaptApplicationDisplayStatus(statusDetail || dto);
  const progress = statusDetail
    ? buildApplicationTimeline(statusDetail)
    : [
        {
          stage: 'Application Submission' as const,
          state: 'completed' as const,
          message: 'Application submitted',
          timestamp: new Date(dto.submittedAt).toLocaleDateString(),
        },
      ];

  return {
    id: String(dto.applicationId),
    companyName: dto.company.companyName,
    position: dto.opportunity.title,
    industry: dto.company.industryName || 'Technology',
    location: 'Quezon City',
    status: displayStatus,
    appliedDate: new Date(dto.submittedAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    progress,
  };
}

export function adaptRequirements(
  res: StudentRequirementsResponse,
): InternshipRequirement[] {
  const standardTypes = [
    {
      id: 'curriculum_vitae_resume',
      title: 'Curriculum Vitae (CV) / Resume',
      desc: 'Updated professional CV or resume showcasing your academic background.',
    },
    {
      id: 'proof_of_residency',
      title: 'Proof of Residency (Quezon City)',
      desc: 'Barangay clearance, voter ID, or utility bill confirming Quezon City residency.',
    },
    {
      id: 'latest_credentials',
      title: 'Latest Academic Credentials',
      desc: 'Transcript of records (TOR), true copy of grades (TCG), or enrollment form.',
    },
    {
      id: 'letter_of_intent',
      title: 'Letter of Intent / Endorsement',
      desc: 'School endorsement or cover letter addressed to QC PESO.',
    },
  ];

  return standardTypes.map((type) => {
    const normTarget = type.id.toLowerCase().replace(/[^a-z0-9]/g, '');
    const submission = res.requirements.find((r) => {
      const normServer = (r.requirement_type_name || '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      return (
        normServer === normTarget ||
        normServer.includes(normTarget) ||
        normTarget.includes(normServer)
      );
    });

    let doc: RequirementDocument | undefined = undefined;
    if (submission) {
      const cleanPath = submission.requirement_file_path.replace(/^\/+/, '');
      const downloadUrl = `${API_BASE_URL}/${cleanPath}`;
      doc = {
        fileName: submission.requirement_name,
        mimeType: 'application/pdf',
        size: 1024 * 1024,
        uploadedAt: new Date(submission.submitted_at).toLocaleDateString(),
        previewUrl: downloadUrl,
      };
    }

    return {
      id: type.id,
      title: type.title,
      description: type.desc,
      status: submission ? 'submitted' : 'pending',
      document: doc,
    };
  });
}

export function adaptAttendance(res: StudentAttendanceResponse): {
  internshipDetails: InternshipDetails | null;
  todayAttendance: TodayAttendance | null;
  records: AttendanceRecord[];
  summary: AttendanceSummary;
} {
  const a = res.assignment;
  let internshipDetails: InternshipDetails | null = null;

  if (a) {
    const statusMap: Record<string, any> = {
      ongoing: 'Ongoing',
      pending: 'Pending',
      completed: 'Completed',
      withdrawn: 'Withdrawn',
      cancelled: 'Cancelled',
    };

    internshipDetails = {
      companyName: a.companyName,
      jobTitle: a.jobTitle,
      workingDays: a.workingDays,
      requiredHours: a.requiredHours,
      startDate: a.startDate,
      expectedEndDate: a.expectedEndDate || '',
      shiftStart: a.startShift,
      shiftEnd: a.endShift,
      status: statusMap[a.assignmentStatus] || 'Ongoing',
      targetHours: a.requiredHours,
      renderedHours: a.totalRenderedHours,
      remainingHours: a.remainingHours,
    };
  }

  let todayAttendance: TodayAttendance | null = null;
  if (a) {
    let todayStatus: 'not-checked-in' | 'checked-in' | 'checked-out' =
      'not-checked-in';
    if (res.today) {
      if (res.today.time_out) {
        todayStatus = 'checked-out';
      } else if (res.today.time_in) {
        todayStatus = 'checked-in';
      }
    }

    todayAttendance = {
      date: new Date().toISOString().split('T')[0],
      status: todayStatus,
      companyName: a.companyName,
      workingDays: a.workingDays,
      shiftStart: a.startShift,
      shiftEnd: a.endShift,
      checkedInAt: res.today?.time_in
        ? String(res.today.time_in).substring(0, 5)
        : undefined,
      checkedOutAt: res.today?.time_out
        ? String(res.today.time_out).substring(0, 5)
        : undefined,
    };
  }

  const records: AttendanceRecord[] = res.records.map((r) => ({
    date: r.date,
    status: r.status,
    checkIn: r.timeIn ? String(r.timeIn).substring(0, 5) : undefined,
    checkOut: r.timeOut ? String(r.timeOut).substring(0, 5) : undefined,
  }));

  return {
    internshipDetails,
    todayAttendance,
    records,
    summary: res.summary,
  };
}
