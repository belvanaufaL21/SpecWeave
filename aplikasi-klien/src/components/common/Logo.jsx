const Logo = ({ 
  size = 'md', 
  showText = true, 
  className = '', 
  textClassName = '',
  subtitle = 'AI-Powered Gherkin Generator',
  onClick = null 
}) => {
  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg', 
    xl: 'text-xl'
  };

  const logoSizeMap = {
    sm: { container: 'w-8 h-8', img: 'w-8 h-8' },
    md: { container: 'w-10 h-10', img: 'w-10 h-10' },
    lg: { container: 'w-12 h-12', img: 'w-12 h-12' },
    xl: { container: 'w-16 h-16', img: 'w-16 h-16' }
  };
  
  const LogoImage = () => (
    <div className={`${logoSizeMap[size].container} ${className} relative flex items-center justify-center`}>
      {/* Outer glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-2xl blur-md opacity-60 animate-pulse"></div>
      
      {/* Logo PNG ONLY */}
      <img 
        src="/logo.png"
        alt="SpecWeave Logo"
        className={`${logoSizeMap[size].img} relative z-10 drop-shadow-2xl rounded-2xl`}
      />
      
      {/* Subtle animation overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-2xl transform rotate-12 animate-pulse"></div>
    </div>
  );

  if (onClick) {
    return (
      <button 
        onClick={onClick} 
        className={`flex items-center gap-3 opacity-90 hover:opacity-100 transition-all duration-300 cursor-pointer hover:scale-105 group`}
      >
        <LogoImage />
        {showText && (
          <div className={`${textClassName}`}>
            <span className={`text-white font-bold tracking-wide ${textSizeClasses[size]} drop-shadow-lg group-hover:text-purple-200 transition-colors duration-300`}
                  style={{
                    textShadow: '0 2px 4px rgba(0,0,0,0.5), 0 0 8px rgba(147, 51, 234, 0.3)'
                  }}>
              <span className="bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent font-extrabold">
                SpecWeave
              </span>
            </span>
            {subtitle && (
              <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
            )}
          </div>
        )}
      </button>
    );
  }

  return (
    <div className={`flex items-center gap-3 opacity-90 hover:opacity-100 transition-all duration-300 group`}>
      <LogoImage />
      {showText && (
        <div className={`${textClassName}`}>
          <span className={`text-white font-bold tracking-wide ${textSizeClasses[size]} drop-shadow-lg group-hover:text-purple-200 transition-colors duration-300`}
                style={{
                  textShadow: '0 2px 4px rgba(0,0,0,0.5), 0 0 8px rgba(147, 51, 234, 0.3)'
                }}>
            <span className="bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent font-extrabold">
              SpecWeave
            </span>
          </span>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Logo;