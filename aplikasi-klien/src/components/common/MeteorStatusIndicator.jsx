import React from 'react';

const MeteorStatusIndicator = ({ isEnabled, className = "" }) => {
  if (!isEnabled) return null;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-medium ${className}`}>
      <div className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
      </div>
      <span>METEOR Active</span>
    </div>
  );
};

export default MeteorStatusIndicator;