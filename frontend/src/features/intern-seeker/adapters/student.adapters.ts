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

  const allowanceStr = dto.hasAllowance
    ? dto.allowance !== null
      ? `PHP ${Number(dto.allowance).toLocaleString()}`
      : 'Allowance Provided'
    : 'No Allowance';

  return {
    id: String(dto.opportunityId),
    companyId: String(dto.companyId),
    companyName: dto.companyName,
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

export function adaptStudentProfile(dto: StudentProfileResponse): UserProfile {
  const s = dto.student;
  const ac = dto.academic;
  const ip = dto.internshipPreference;
  const pi = dto.preferredIndustries || [];

  return {
    id: String(s.student_id),
    firstName: s.first_name,
    middleName: s.middle_name || '',
    lastName: s.last_name,
    extensionName: s.extension_name || '',
    role: 'Intern Seeker',
    location: `${s.address_barangay}, ${s.address_city}`,
    email: s.contact_email,
    linkedinUrl: s.linkedin_url || '',
    internshipStatus: 'Not Employed',
    sex: s.sex,
    birthdate: s.birth_date,
    contactNumber: s.contact_number,
    address: {
      street: s.address_line,
      barangay: s.address_barangay,
      district: s.address_district,
      city: s.address_city,
    },
    inquiryVia: s.inquiry_method,
    academic: {
      schoolName: ac?.school_name || '',
      program: ac?.strand_program || '',
      yearLevel: ac?.year_level || '',
    },
    preferences: {
      requiredHours: ip ? ip.required_hours : '',
      willingToAssignOutside: ip ? ip.allows_outside_preferred_field : false,
      preferredIndustries: pi.map((p) => p.industry_name || p.custom_industry_name || String(p.industry_id)),
      otherPreferredField: '',
      schedule: ip ? [ip.available_days] : ['weekdays'],
      startDate: ip ? ip.start_date : '',
      hostOrgType: ip ? ip.preferred_company_type : 'private',
    },
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
    if (app.referral.companyResponse === 'for_interview') return 'Interview Scheduled';
    return 'Endorsed to Company';
  }

  if (app.applicationStatus === 'approved_for_referral') return 'Endorsed to Company';
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
          mode: app.interview.interview_mode === 'online' ? 'online' : 'in-person',
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
        state: app.referral.companyResponse === 'accepted' ? 'completed' : 'current',
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
        timestamp: app.studentRespondedAt ? new Date(app.studentRespondedAt).toLocaleDateString() : undefined,
      });
    } else if (app.studentResponse === 'declined') {
      steps.push({
        stage: 'Student Decision',
        state: 'rejected',
        message: 'Offer declined by applicant.',
        timestamp: app.studentRespondedAt ? new Date(app.studentRespondedAt).toLocaleDateString() : undefined,
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
    const submission = res.requirements.find(
      (r) =>
        r.requirement_type_name.toLowerCase().includes(type.id.replace(/_/g, ' ')) ||
        r.requirement_name.toLowerCase().includes(type.id.replace(/_/g, ' ')),
    );

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
    let todayStatus: 'not-checked-in' | 'checked-in' | 'checked-out' = 'not-checked-in';
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
      checkedInAt: res.today?.time_in ? String(res.today.time_in).substring(0, 5) : undefined,
      checkedOutAt: res.today?.time_out ? String(res.today.time_out).substring(0, 5) : undefined,
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
