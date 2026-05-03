import { useState, useEffect, useRef } from 'react';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DAY_LABELS = ['Mg', 'Sn', 'Sl', 'Rb', 'Km', 'Jm', 'Sb'];

const parseISODate = (str) => {
  if (!str) return null;
  return new Date(str + 'T00:00:00');
};

const formatISODate = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatDisplay = (str) => {
  const d = parseISODate(str);
  if (!d) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd} / ${mm} / ${yyyy}`;
};

const isSameDay = (a, b) => {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

/**
 * Custom date picker dengan tema dark match SpecWeave.
 * Menggantikan native <input type="date"> yang tidak bisa di-style.
 *
 * Props:
 * - value     : string format 'YYYY-MM-DD' (sama seperti native date input)
 * - onChange  : (event) => void  // event.target.{name, value}
 * - name      : nama field
 * - minDate   : 'YYYY-MM-DD' atau null  (tanggal minimum yang dapat dipilih)
 * - maxDate   : 'YYYY-MM-DD' atau null  (tanggal maksimum yang dapat dipilih)
 * - hasError  : boolean — menampilkan border merah ketika true
 * - placeholder: string — teks placeholder ketika value kosong
 */
const CustomDatePicker = ({
  value,
  onChange,
  name,
  minDate,
  maxDate,
  hasError = false,
  placeholder = 'dd / mm / yyyy',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => parseISODate(value) || new Date());
  const containerRef = useRef(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const min = parseISODate(minDate);
  const max = parseISODate(maxDate);
  const selected = parseISODate(value);

  // Sinkronkan viewDate jika value berubah dari luar
  useEffect(() => {
    if (value) {
      setViewDate(parseISODate(value));
    }
  }, [value]);

  // Tutup ketika klik di luar atau tekan Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const isDisabled = (date) => {
    if (min && date < min) return true;
    if (max && date > max) return true;
    return false;
  };

  const triggerChange = (val) => {
    onChange({ target: { name, value: val } });
  };

  const handleSelectDate = (date) => {
    if (isDisabled(date)) return;
    triggerChange(formatISODate(date));
    setIsOpen(false);
  };

  const handleClear = () => {
    triggerChange('');
    setIsOpen(false);
  };

  const handleToday = () => {
    if (isDisabled(today)) return;
    handleSelectDate(today);
  };

  const goPrev = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const goNext = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  // Cek apakah navigasi prev/next masih valid (tidak melampaui min/max)
  const canGoPrev = !min || new Date(viewDate.getFullYear(), viewDate.getMonth(), 0) >= min;
  const canGoNext = !max || new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1) <= max;

  // Bangun grid 6x7 (42 sel)
  const buildGrid = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();

    const cells = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(year, month, 1 - startOffset + i);
      cells.push({
        date,
        isCurrentMonth: date.getMonth() === month,
      });
    }
    return cells;
  };

  const cells = buildGrid();

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Button (menggantikan input field) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 bg-[#0D0D0D] border rounded-lg text-left transition-all flex items-center justify-between cursor-pointer ${
          hasError
            ? 'border-red-500/50'
            : isOpen
            ? 'border-white/50'
            : 'border-white/5 hover:border-white/20'
        }`}
      >
        <span className={value ? 'text-white text-sm' : 'text-gray-500 text-sm'}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <svg
          className={`w-5 h-5 flex-shrink-0 transition-colors ${
            isOpen ? 'text-[#FF7AD0]' : 'text-gray-400'
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </button>

      {/* Calendar Popup — lebar mengikuti parent (left-0 right-0) */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-[#09090A] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header — bulan, tahun, navigasi */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <div className="text-white font-semibold text-sm">
              {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={goPrev}
                disabled={!canGoPrev}
                className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                aria-label="Bulan sebelumnya"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={!canGoNext}
                className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                aria-label="Bulan berikutnya"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Label hari */}
          <div className="grid grid-cols-7 gap-0.5 px-3">
            {DAY_LABELS.map((label) => (
              <div
                key={label}
                className="text-center text-[11px] font-medium text-gray-500 py-1.5 uppercase tracking-wider"
              >
                {label}
              </div>
            ))}
          </div>

          {/* Grid tanggal */}
          <div className="grid grid-cols-7 gap-0.5 px-3 pb-3">
            {cells.map((cell, idx) => {
              const disabled = isDisabled(cell.date);
              const isSelected = selected && isSameDay(cell.date, selected);
              const isTodayCell = isSameDay(cell.date, today);

              let cellClass = 'aspect-square flex items-center justify-center text-sm rounded-md transition-all';

              if (isSelected) {
                cellClass += ' bg-[#160D14] border border-[#44273D] text-[#FF7AD0] font-semibold';
              } else if (disabled) {
                cellClass += ' text-gray-700 cursor-not-allowed';
              } else if (!cell.isCurrentMonth) {
                cellClass += ' text-gray-600 hover:bg-white/5 hover:text-gray-400 cursor-pointer';
              } else if (isTodayCell) {
                cellClass += ' text-white border border-white/10 hover:bg-white/5 cursor-pointer';
              } else {
                cellClass += ' text-white hover:bg-white/5 cursor-pointer';
              }

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDate(cell.date)}
                  disabled={disabled}
                  className={cellClass}
                >
                  {cell.date.getDate()}
                </button>
              );
            })}
          </div>

          {/* Footer — Hapus & Hari Ini */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded font-medium"
            >
              Hapus
            </button>
            <button
              type="button"
              onClick={handleToday}
              disabled={isDisabled(today)}
              className="text-xs text-[#FF7AD0] hover:text-[#FF7AD0]/80 transition-colors px-2 py-1 rounded font-medium disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Hari Ini
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomDatePicker;