import React, { useEffect, useState } from 'react';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../stores/useAuthStore';
import { RefreshCw, Clock, XCircle, LogOut } from 'lucide-react';

interface VerificationStatusData {
  verificationStatus: 'pending' | 'approved' | 'rejected';
  reviewedAt: string | null;
  verificationRemark: string | null;
}

interface PesoVerificationGateProps {
  children: React.ReactNode;
}

export const PesoVerificationGate: React.FC<PesoVerificationGateProps> = ({ children }) => {
  const { user, loadMe, logout } = useAuthStore();
  const [data, setData] = useState<VerificationStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [resubmitting, setResubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await api.get<VerificationStatusData>('/users/peso/verification-status');
      setData(res.data);
      if (res.data.verificationStatus === 'approved') {
        await loadMe();
      }
    } catch (err: any) {
      console.error('Failed to fetch verification status', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleResubmit = async () => {
    setResubmitting(true);
    setMessage(null);
    try {
      await api.post('/users/peso/resubmit');
      setMessage('Your verification request has been resubmitted successfully.');
      await fetchStatus();
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Failed to resubmit. Only rejected accounts can be resubmitted.');
    } finally {
      setResubmitting(false);
    }
  };

  const status = data?.verificationStatus || user?.verificationStatus || 'pending';

  if (status === 'approved') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-200 text-center">
        {status === 'pending' && (
          <>
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600">
              <Clock className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Verification Pending</h2>
            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
              Your QC PESO personnel account is currently awaiting administrative approval. Operational dashboard routes are restricted until your credentials are verified.
            </p>
          </>
        )}

        {status === 'rejected' && (
          <>
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-600">
              <XCircle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Verification Rejected</h2>
            <p className="text-slate-600 text-sm mb-4 leading-relaxed">
              Your verification request was rejected by an administrator.
            </p>
            {data?.verificationRemark && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-xl mb-6 text-left">
                <span className="font-semibold block mb-1">Administrator Remark:</span>
                {data.verificationRemark}
              </div>
            )}
            <button
              onClick={handleResubmit}
              disabled={resubmitting}
              className="w-full mb-3 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium rounded-xl transition shadow-md flex items-center justify-center gap-2"
            >
              {resubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
              Resubmit for Review
            </button>
          </>
        )}

        {message && (
          <p className="text-xs text-slate-700 mb-4 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            {message}
          </p>
        )}

        <div className="flex gap-3 justify-center mt-6">
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="py-2 px-4 border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium rounded-xl text-sm transition flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Check Status
          </button>
          <button
            onClick={() => logout()}
            className="py-2 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-xl text-sm transition flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};
