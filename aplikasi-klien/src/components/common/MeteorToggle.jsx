import { useState, useEffect } from 'react';

const MeteorToggle = ({ value, onChange, className = '' }) => {
  const [isEnabled, setIsEnabled] = useState(value || false);

  useEffect(() => {
    setIsEnabled(value || false);
  }, [value]);

  const handleToggle = () => {
    const newValue = !isEnabled;
    setIsEnabled(newValue);
    if (onChange) {
      onChange(newValue);
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border
        ${isEnabled 
          ? 'bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20 shadow-[0_0_8px_rgba(147,51,234,0.15)]' 
          : 'bg-gray-500/10 text-gray-400 border-gray-500/20 hover:bg-gray-500/20'
        }
        ${className}
      `}
      title={isEnabled ? 'Disable METEOR Quality Assessment' : 'Enable METEOR Quality Assessment'}
    >
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
      </svg>
      <span className="truncate">
        {isEnabled ? 'METEOR ON' : 'METEOR OFF'}
      </span>
    </button>
  );
};

export default MeteorToggle;