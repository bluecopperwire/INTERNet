import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../../../services/auth.service';
import { useAuthStore } from '../../../stores/useAuthStore';

export const AuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAccessToken, loadMe } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleExchange = async () => {
      const status = searchParams.get('status');
      if (status === 'success') {
        try {
          const res = await authService.exchangeGoogleLogin();
          setAccessToken(res.accessToken);
          await loadMe();
          navigate('/', { replace: true });
        } catch (err: any) {
          setError(err.message || 'Failed to complete Google authentication');
        }
      } else {
        setError('Authentication was cancelled or failed.');
      }
    };

    handleExchange();
  }, [searchParams, navigate, setAccessToken, loadMe]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      {error ? (
        <div className="max-w-md w-full bg-white p-6 rounded-2xl shadow border border-rose-200 text-center">
          <h2 className="text-xl font-bold text-rose-600 mb-2">Authentication Failed</h2>
          <p className="text-slate-600 text-sm mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition"
          >
            Return to Login
          </button>
        </div>
      ) : (
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm font-medium text-slate-600">Completing Google Authentication...</p>
        </div>
      )}
    </div>
  );
};
