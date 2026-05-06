import { useEffect, useState } from 'react';

/**
 * LimitExceededCard
 * 
 * Card UI untuk menampilkan informasi ketika limit harian model LLM tercapai.
 * Mengikuti pola Claude.ai: pesan jelas + countdown live + alternatif model.
 * 
 * Props:
 * - error: object dari response 429 backend
 *   { model, displayName, used, limit, resetsAt, alternatives: [...] }
 * - onSwitchModel: (modelName) => void  — dipanggil saat user klik tombol switch
 * - onRetry: () => void                  — dipanggil saat user klik "Coba lagi"
 */
const LimitExceededCard = ({ error, onSwitchModel, onRetry }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [isReady, setIsReady] = useState(false);

  // Live countdown — update tiap detik
  useEffect(() => {
    if (!error?.resetsAt) return;

    const updateCountdown = () => {
      const now = new Date();
      const reset = new Date(error.resetsAt);
      const diff = reset - now;

      if (diff <= 0) {
        setTimeLeft('Cooldown berakhir — silakan coba lagi');
        setIsReady(true);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeLeft(`${hours}j ${minutes}m ${seconds}d`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}d`);
      } else {
        setTimeLeft(`${seconds} detik`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [error?.resetsAt]);

  if (!error) return null;

  const usagePercent = Math.min(100, Math.round((error.used / error.limit) * 100));
  const alternatives = error.alternatives || [];

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        borderColor: 'rgba(255, 255, 255, 0.05)',
        backgroundColor: 'transparent',
      }}
    >
      {/* Header */}
      <div
        className="flex items-start gap-3 px-4 py-3 border-b"
        style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
      >
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 border"
          style={{ backgroundColor: '#140D0C', borderColor: '#3E2827' }}
        >
          <svg
            className="w-4 h-4"
            style={{ color: '#D14F42' }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white mb-0.5">
            Limit harian tercapai
          </div>
          <div className="text-xs text-gray-400">
            Model{' '}
            <span className="text-white">
              {error.displayName || error.model}
            </span>{' '}
            sudah mencapai batas request hari ini.
          </div>
        </div>
      </div>

      {/* Usage bar */}
      <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-gray-500">Penggunaan hari ini</span>
          <span className="text-gray-300 font-medium">
            {error.used}/{error.limit} request
          </span>
        </div>
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
        >
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${usagePercent}%`,
              backgroundColor: '#C27AFF',
            }}
          />
        </div>
      </div>

      {/* Countdown */}
      <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
        <div className="flex items-center gap-2">
          <svg
            className="w-3.5 h-3.5 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-xs text-gray-500">Reset dalam</span>
          <span
            className="text-xs font-mono font-medium ml-auto"
            style={{ color: '#C27AFF' }}
          >
            {timeLeft}
          </span>
        </div>
      </div>

      {/* Alternatives */}
      {alternatives.length > 0 && (
        <div className="px-4 py-3">
          <div className="text-xs text-gray-500 mb-2">
            Lanjutkan dengan model lain yang masih tersedia:
          </div>
          <div className="space-y-1.5">
            {alternatives.slice(0, 4).map((alt) => (
              <button
                key={alt.model}
                onClick={() => onSwitchModel?.(alt.model)}
                className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg border transition-all text-left group cursor-pointer"
                style={{
                  borderColor: 'rgba(255, 255, 255, 0.05)',
                  backgroundColor: 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#2C1A43';
                  e.currentTarget.style.backgroundColor = 'rgba(44, 26, 67, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">
                    {alt.displayName}
                  </div>
                  <div className="text-xs text-gray-500">
                    {alt.remaining}/{alt.dailyLimit} tersisa · {alt.provider}
                  </div>
                </div>
                <svg
                  className="w-3.5 h-3.5 text-gray-600 group-hover:text-white flex-shrink-0 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Retry button bila cooldown sudah habis */}
      {isReady && (
        <div className="px-4 py-3 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
          <button
            onClick={onRetry}
            className="w-full px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer"
            style={{
              backgroundColor: '#C27AFF',
              color: '#09090A',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* Empty state — tidak ada alternatif & belum ready */}
      {alternatives.length === 0 && !isReady && (
        <div className="px-4 py-3">
          <div className="text-xs text-gray-500 text-center">
            Semua model sudah mencapai limit. Silakan tunggu hingga cooldown berakhir.
          </div>
        </div>
      )}
    </div>
  );
};

export default LimitExceededCard;
