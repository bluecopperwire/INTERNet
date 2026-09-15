import { useState, useEffect, useCallback } from 'react';
import { qcpesoService } from '../services/qcpeso.service';
import type { 
  QCPesoDashboardSummary, 
  QCPesoProfile, 
  QCPesoReviewApplicant,
  QCPesoInternshipHistorySummary,
  QCPesoFinalizationSummary,
} from '../types/qcpeso.types';
import {
  APPLICATION_CLOSED_STATUSES,
  APPLICATION_ONGOING_STATUSES,
} from '../../workflow/status-mappings';

export function buildQCPesoDashboardSummary(
  base: QCPesoDashboardSummary,
  internshipSummary: QCPesoInternshipHistorySummary,
  finalizationSummary: QCPesoFinalizationSummary,
  applicationHistory: QCPesoReviewApplicant[],
): QCPesoDashboardSummary {
  const activeApplications = applicationHistory.filter((application) =>
    APPLICATION_ONGOING_STATUSES.includes(
      application.historyStatus ?? 'For Review (QC PESO)',
    ),
  ).length;
  const closedApplications = applicationHistory.filter((application) =>
    APPLICATION_CLOSED_STATUSES.includes(
      application.historyStatus ?? 'For Review (QC PESO)',
    ),
  ).length;
  const categorizedApplications = activeApplications + closedApplications;
  const activePercentage = categorizedApplications
    ? Math.round((activeApplications / categorizedApplications) * 100)
    : 0;

  return {
    ...base,
    activeInternships: internshipSummary.activeInternships,
    awaitingFinalization: finalizationSummary.awaitingFinalization,
    totalApplications: applicationHistory.length,
    activeApplications,
    activePercentage,
    closedPercentage: categorizedApplications ? 100 - activePercentage : 0,
  };
}

export function latestApplicationsForReview(
  applicationHistory: QCPesoReviewApplicant[],
): QCPesoReviewApplicant[] {
  return applicationHistory
    .filter((application) => application.historyStatus === 'For Review (QC PESO)')
    .slice(0, 5);
}

export function useQCPeso() {
  const [summary, setSummary] = useState<QCPesoDashboardSummary | null>(null);
  const [profile, setProfile] = useState<QCPesoProfile | null>(null);
  const [students, setStudents] = useState<QCPesoReviewApplicant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [baseSummary, profileData, applicationHistory, internshipSummary, finalizationSummary] = await Promise.all([
        qcpesoService.getDashboardSummary(),
        qcpesoService.getProfile(),
        qcpesoService.getApplicationHistory(),
        qcpesoService.getInternshipHistorySummary(),
        qcpesoService.getFinalizationSummary(),
      ]);
      setSummary(buildQCPesoDashboardSummary(
        baseSummary,
        internshipSummary,
        finalizationSummary,
        applicationHistory,
      ));
      setProfile(profileData);
      setStudents(latestApplicationsForReview(applicationHistory));
    } catch {
      setError('Failed to load QCPESO data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { summary, profile, students, isLoading, error, refetch: fetchData };
}
