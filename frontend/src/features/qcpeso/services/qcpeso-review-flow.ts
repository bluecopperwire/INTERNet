import type { QCPesoReviewApplicant } from "../types/qcpeso.types";

type ReviewApplicant = Pick<QCPesoReviewApplicant, "id" | "applicationStatus">;

interface OpenReviewDependencies {
  markUnderReview: (applicationId: number) => Promise<unknown>;
  navigate: (path: string) => void;
  onMutationError: (error: unknown) => void;
}

interface DetailDependencies<T> {
  getDetail: (applicationId: string) => Promise<T>;
}

export function reviewApplicantPath(applicationId: string): string {
  return `/qcpeso/manage-applicants/review/${applicationId}`;
}

export async function openApplicantForReview(
  applicant: ReviewApplicant,
  dependencies: OpenReviewDependencies,
): Promise<void> {
  if (applicant.applicationStatus === "submitted") {
    try {
      await dependencies.markUnderReview(Number(applicant.id));
    } catch (error: unknown) {
      dependencies.onMutationError(error);
    }
  }

  dependencies.navigate(reviewApplicantPath(applicant.id));
}

export function getApplicantReviewDetail<T>(
  applicationId: string,
  dependencies: DetailDependencies<T>,
): Promise<T> {
  return dependencies.getDetail(applicationId);
}
