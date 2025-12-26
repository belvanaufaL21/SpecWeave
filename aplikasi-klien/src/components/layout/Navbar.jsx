import { Link, useLocation } from 'react-router-dom';
import Logo from '../common/Logo';

const Navbar = () => {
  const location = useLocation();
  
  return (
    <nav className="sticky top-0 z-50 backdrop-blur-lg bg-[#0a0a0f]/80 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="group">
            <Logo size="md" showText={true} textClassName="text-lg font-semibold" />
          </Link>

          {/* Navigation */}
          <div className="flex items-center gap-6">
            <Link 
              to="/"
              className={`text-sm font-medium transition-colors ${
                location.pathname === '/' 
                  ? 'text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Home
            </Link>
            <Link 
              to="/chat"
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                location.pathname === '/chat'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25'
                  : 'bg-[#1a1a2e] text-gray-300 hover:bg-[#22223a] hover:text-white border border-white/10'
              }`}
            >
              Start Converting
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
