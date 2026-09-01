import { describe, expect, it, vi } from "vitest";
import type { ApplicationStatus } from "../../../types/api";
import { adaptPesoApplication } from "../adapters/qcpeso.adapters";
import {
  getApplicantReviewDetail,
  openApplicantForReview,
} from "./qcpeso-review-flow";

function applicant(id: string, applicationStatus: ApplicationStatus) {
  return { id, applicationStatus };
}

describe("QC PESO applicant review navigation", () => {
  it("marks a submitted application under review exactly once before navigating", async () => {
    const markUnderReview = vi.fn().mockResolvedValue(undefined);
    const navigate = vi.fn();

    await openApplicantForReview(applicant("22", "submitted"), {
      markUnderReview,
      navigate,
      onMutationError: vi.fn(),
    });

    expect(markUnderReview).toHaveBeenCalledTimes(1);
    expect(markUnderReview).toHaveBeenCalledWith(22);
    expect(navigate).toHaveBeenCalledWith(
      "/qcpeso/manage-applicants/review/22",
    );
  });

  it.each([
    "under_review",
    "approved_for_referral",
    "rejected_for_referral",
    "closed",
    "withdrawn",
    "expired",
  ] as const)(
    "opens an application in %s without a review mutation",
    async (status) => {
      const markUnderReview = vi.fn().mockResolvedValue(undefined);
      const navigate = vi.fn();

      await openApplicantForReview(applicant("23", status), {
        markUnderReview,
        navigate,
        onMutationError: vi.fn(),
      });

      expect(markUnderReview).not.toHaveBeenCalled();
      expect(navigate).toHaveBeenCalledWith(
        "/qcpeso/manage-applicants/review/23",
      );
    },
  );

  it("reports a review mutation error separately and still opens the detail page", async () => {
    const conflict = new Error("Request failed with status code 409");
    const onMutationError = vi.fn();
    const navigate = vi.fn();

    await openApplicantForReview(applicant("24", "submitted"), {
      markUnderReview: vi.fn().mockRejectedValue(conflict),
      navigate,
      onMutationError,
    });

    expect(onMutationError).toHaveBeenCalledWith(conflict);
    expect(navigate).toHaveBeenCalledWith(
      "/qcpeso/manage-applicants/review/24",
    );
  });
});

describe("QC PESO applicant detail retrieval", () => {
  it("uses only the requested route ID on initial load, refresh, and applicant switches", async () => {
    const getDetail = vi.fn(async (id: string) => ({ id }));

    await getApplicantReviewDetail("22", { getDetail });
    await getApplicantReviewDetail("22", { getDetail });
    await getApplicantReviewDetail("31", { getDetail });

    expect(getDetail.mock.calls).toEqual([["22"], ["22"], ["31"]]);
  });

  it.each([
    "submitted",
    "under_review",
    "approved_for_referral",
    "rejected_for_referral",
    "closed",
    "withdrawn",
    "expired",
  ] as const)(
    "preserves raw workflow status %s for action decisions",
    (status) => {
      expect(
        adaptPesoApplication({ applicationId: 1, applicationStatus: status })
          .applicationStatus,
      ).toBe(status);
    },
  );
});
