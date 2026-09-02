import { describe, expect, it } from "vitest";
import type { StudentApplicationStatusDto, StudentProfileResponse } from "../../../types/api";
import {
  adaptApplication,
  adaptStudentProfile,
  adaptStudentProfileToUpdateDto,
} from "./student.adapters";

function applicationStatus(
  overrides: Partial<StudentApplicationStatusDto> = {},
): StudentApplicationStatusDto {
  return {
    applicationId: 1,
    submittedAt: "2026-07-20T03:15:00.000Z",
    applicationStatus: "submitted",
    studentResponse: "pending",
    opportunity: {
      opportunityId: 10,
      title: "Software Intern",
      department: "Engineering",
      workArrangement: "hybrid",
      minimumRequiredHours: 300,
      applicationDeadline: "2026-09-30T00:00:00.000Z",
      status: "open",
    },
    company: {
      companyId: 5,
      companyName: "Example Company",
      companyType: "private",
    },
    referral: null,
    assignment: null,
    interview: null,
    timeline: [],
    referralTimeline: [],
    ...overrides,
  };
}

function profileResponse(
  overrides: Partial<StudentProfileResponse> = {},
): StudentProfileResponse {
  return {
    student: {
      student_id: 41,
      user_account_id: 91,
      first_name: "Ana",
      last_name: "Student",
      sex: "female",
      birth_date: "2004-05-06",
      contact_number: "09123456789",
      contact_email: "ana@example.test",
      address_line: "1 Test Street",
      address_barangay: "Test Barangay",
      address_district: "District 1",
      address_city: "Quezon City",
      inquiry_method: "online",
    },
    academic: null,
    internshipPreference: null,
    preferredIndustries: [],
    ...overrides,
  };
}

describe("student profile adapters", () => {
  it("restores signup sex and leaves unanswered internship preferences blank", () => {
    const profile = adaptStudentProfile(profileResponse());

    expect(profile.sex).toBe("Female");
    expect(profile.preferences).toMatchObject({
      requiredHours: "",
      hostOrgType: "",
      schedule: [],
      willingToAssignOutside: null,
      preferredIndustries: [],
      otherPreferredField: "",
    });
  });

  it("does not manufacture valid preference values when blank fields are submitted", () => {
    const payload = adaptStudentProfileToUpdateDto(
      adaptStudentProfile(profileResponse()),
      [
        {
          industryId: 1,
          industryName: "Information Technology",
        },
      ],
    );

    expect(payload).toMatchObject({
      sex: "female",
      internshipPreference: {
        requiredHours: 0,
        availableDays: "",
        preferredCompanyType: "",
        startDate: "",
        allowsOutsidePreferredField: null,
      },
      preferredIndustries: [],
    });
  });

  it("keeps birth and preferred start dates stable across repeated edits", () => {
    const response = profileResponse({
      student: {
        ...profileResponse().student,
        birth_date: "2004-05-16T16:00:00.000Z",
      },
      internshipPreference: {
        required_hours: 400,
        allows_outside_preferred_field: true,
        preferred_company_type: "private",
        available_days: "weekdays",
        start_date: "2098-12-31T16:00:00.000Z",
      },
    });

    const firstView = adaptStudentProfile(response);
    expect(firstView.birthdate).toBe("2004-05-17");
    expect(firstView.preferences.startDate).toBe("2099-01-01");

    const firstSave = adaptStudentProfileToUpdateDto(firstView, []);
    expect(firstSave.birthDate).toBe("2004-05-17");
    expect(firstSave.internshipPreference.startDate).toBe("2099-01-01");

    const secondView = adaptStudentProfile(
      profileResponse({
        student: {
          ...profileResponse().student,
          birth_date: firstSave.birthDate,
        },
        internshipPreference: {
          required_hours: 400,
          allows_outside_preferred_field: true,
          preferred_company_type: "private",
          available_days: "weekdays",
          start_date: firstSave.internshipPreference.startDate,
        },
      }),
    );
    expect(secondView.birthdate).toBe("2004-05-17");
    expect(secondView.preferences.startDate).toBe("2099-01-01");
  });

  it("round-trips Other through the designated custom industry", () => {
    const profile = adaptStudentProfile(
      profileResponse({
        academic: {
          school_name: "Quezon City University",
          strand_program: "BS Information Technology",
          year_level: "fourth_year_college",
        },
        internshipPreference: {
          required_hours: 400,
          allows_outside_preferred_field: false,
          preferred_company_type: "private",
          available_days: "weekends",
          start_date: "2099-01-01",
        },
        preferredIndustries: [
          {
            industry_id: 9,
            industry_name: "Other",
            custom_industry_name: "Software Development",
          },
        ],
      }),
    );

    expect(profile.preferences.preferredIndustries).toEqual(["Other"]);
    expect(profile.preferences.otherPreferredField).toBe(
      "Software Development",
    );

    const payload = adaptStudentProfileToUpdateDto(profile, [
      {
        industryId: 9,
        industryName: "Other",
        isCustomText: true,
      },
    ]);
    expect(payload.preferredIndustries).toEqual([
      {
        industryId: 9,
        customIndustryName: "Software Development",
      },
    ]);
    expect(payload.internshipPreference).toMatchObject({
      availableDays: "weekends",
      preferredCompanyType: "private",
      allowsOutsidePreferredField: false,
    });
  });

  it("does not send stale custom text when Other is no longer selected", () => {
    const profile = adaptStudentProfile(profileResponse());
    profile.academic = {
      schoolName: "Quezon City University",
      program: "BS Information Technology",
      yearLevel: "4th Year",
    };
    profile.preferences = {
      requiredHours: 400,
      willingToAssignOutside: true,
      preferredIndustries: ["Information Technology"],
      otherPreferredField: "Stale custom value",
      schedule: ["Flexible"],
      startDate: "2099-01-01",
      hostOrgType: "Government",
    };

    const payload = adaptStudentProfileToUpdateDto(profile, [
      {
        industryId: 1,
        industryName: "Information Technology",
      },
      { industryId: 9, industryName: "Other", isCustomText: true },
    ]);

    expect(payload.preferredIndustries).toEqual([{ industryId: 1 }]);
  });
});

describe("student application presentation", () => {
  const referral = (
    companyResponse: "pending" | "for_interview" | "accepted" | "rejected",
    referralStatus: "sent" | "under_review" | "closed" | "withdrawn" | "expired" = "under_review",
  ) => ({
    referralId: 20,
    referralStatus,
    companyResponse,
    referredAt: "2026-07-21T01:00:00.000Z",
    companyRespondedAt: companyResponse === "pending" ? null : "2026-07-22T02:00:00.000Z",
    remark: companyResponse === "rejected" ? "Role was filled." : null,
  });

  it.each([
    ["submitted", applicationStatus(), "For Review (QC PESO)", ["completed", "pending", "pending", "pending", "pending"]],
    ["QC review", applicationStatus({ applicationStatus: "under_review" }), "Under Review (QC PESO)", ["completed", "current", "pending", "pending", "pending"]],
    ["QC rejected", applicationStatus({ applicationStatus: "rejected_for_referral", remark: "Missing credential" }), "Rejected", ["completed", "rejected", "pending", "pending", "pending"]],
    ["endorsed", applicationStatus({ applicationStatus: "approved_for_referral", referral: referral("pending", "sent") }), "Endorsed to Company", ["completed", "completed", "pending", "pending", "pending"]],
    ["company review", applicationStatus({ applicationStatus: "approved_for_referral", referral: referral("pending") }), "Under Review (Company)", ["completed", "completed", "current", "pending", "pending"]],
    ["interview", applicationStatus({ applicationStatus: "approved_for_referral", referral: referral("for_interview") }), "Interview Scheduled", ["completed", "completed", "interview-scheduled", "pending", "pending"]],
    ["offer", applicationStatus({ applicationStatus: "approved_for_referral", referral: referral("accepted") }), "Offer Received", ["completed", "completed", "completed", "completed", "current"]],
    ["company rejected", applicationStatus({ applicationStatus: "closed", referral: referral("rejected", "closed") }), "Rejected", ["completed", "completed", "completed", "rejected", "pending"]],
    ["student accepted", applicationStatus({ applicationStatus: "closed", studentResponse: "accepted", referral: referral("accepted", "closed") }), "Accepted", ["completed", "completed", "completed", "completed", "completed"]],
    ["student declined", applicationStatus({ applicationStatus: "closed", studentResponse: "declined", referral: referral("accepted", "closed") }), "Offer Declined", ["completed", "completed", "completed", "completed", "rejected"]],
    ["withdrawn", applicationStatus({ applicationStatus: "withdrawn" }), "Withdrawn", ["completed", "pending", "pending", "pending", "withdrawn"]],
    ["expired before referral", applicationStatus({ applicationStatus: "expired" }), "Expired", ["completed", "expired", "pending", "pending", "pending"]],
    ["expired at company review", applicationStatus({ applicationStatus: "expired", referral: referral("for_interview", "expired") }), "Expired", ["completed", "completed", "expired", "pending", "pending"]],
    ["expired after acceptance", applicationStatus({ applicationStatus: "expired", referral: referral("accepted", "expired") }), "Expired", ["completed", "completed", "completed", "expired", "pending"]],
  ] as const)("maps %s to one badge and five stages", (_name, dto, badge, states) => {
    const presentation = adaptApplication(dto, dto);
    expect(presentation.status).toBe(badge);
    expect(presentation.progress).toHaveLength(5);
    expect(presentation.progress.map((stage) => stage.state)).toEqual(states);
  });

  it("uses declined wording and never exposes offer actions after closure", () => {
    const dto = applicationStatus({
      applicationStatus: "closed",
      studentResponse: "declined",
      referral: referral("accepted", "closed"),
    });
    const presentation = adaptApplication(dto, dto);
    expect(presentation.progress[4].message).toBe("You have declined the internship offer.");
    expect(presentation.canRespondToOffer).toBe(false);
    expect(presentation.canWithdraw).toBe(false);
    expect(presentation.canHide).toBe(true);
  });
});
