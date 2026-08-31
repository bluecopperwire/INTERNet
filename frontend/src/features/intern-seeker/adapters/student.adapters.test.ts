import { describe, expect, it } from "vitest";
import type { StudentProfileResponse } from "../../../types/api";
import {
  adaptStudentProfile,
  adaptStudentProfileToUpdateDto,
} from "./student.adapters";

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
