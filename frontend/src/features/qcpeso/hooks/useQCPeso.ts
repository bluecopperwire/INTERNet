import { useState, useEffect, useCallback } from 'react';
import { qcpesoService } from '../services/qcpeso.service';
import type { 
  QCPesoDashboardSummary, 
  QCPesoProfile, 
  StudentApplication
} from '../types/qcpeso.types';

export function useQCPeso() {
  const [summary, setSummary] = useState<QCPesoDashboardSummary | null>(null);
  const [profile, setProfile] = useState<QCPesoProfile | null>(null);
  const [students, setStudents] = useState<StudentApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [summaryData, profileData, studentsData] = await Promise.all([
        qcpesoService.getDashboardSummary(),
        qcpesoService.getProfile(),
        qcpesoService.getRecentStudents()
      ]);
      setSummary(summaryData);
      setProfile(profileData);
      setStudents(studentsData);
    } catch (err) {
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
