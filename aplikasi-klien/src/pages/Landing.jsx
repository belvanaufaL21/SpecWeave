import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isUserRegistered, registerUser } from '../utils/userValidation';
import Logo from '../components/common/Logo';

// Custom hook for scroll animation
const useScrollAnimation = () => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  return [ref, isVisible];
};

// Animated counter component
const AnimatedCounter = ({ end, duration = 2000, suffix = '' }) => {
  const [count, setCount] = useState(0);
  const [ref, isVisible] = useScrollAnimation();

  useEffect(() => {
    if (!isVisible) return;
    
    let startTime;
    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [isVisible, end, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
};

const Landing = () => {
  const { signInWithEmail, signInWithGoogle, signUp, loading, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // Check URL params for mode and error
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    const errorParam = urlParams.get('error');
    const messageParam = urlParams.get('message');
    
    if (mode === 'signup') {
      setIsSignup(true);
    } else if (mode === 'signin') {
      setIsSignup(false);
    }
    
    // Handle error from redirect
    if (errorParam === 'not_registered') {
      const errorMessage = messageParam 
        ? decodeURIComponent(messageParam)
        : 'Sign-in failed: Account not found. Please sign up first with your Google account.';
      setError(errorMessage);
      setIsSignup(true); // Force to signup mode
    } else if (errorParam === 'signin_blocked') {
      const errorMessage = messageParam 
        ? decodeURIComponent(messageParam)
        : 'Access denied. Your Google account is not registered in our system. Please sign up first to create your account.';
      setError(errorMessage);
      setIsSignup(true); // Force to signup mode
    } else if (errorParam === 'validation_failed') {
      const errorMessage = messageParam 
        ? decodeURIComponent(messageParam)
        : 'Authentication validation failed. Please try again.';
      setError(errorMessage);
    } else if (errorParam === 'invalid_session') {
      const errorMessage = messageParam 
        ? decodeURIComponent(messageParam)
        : 'Invalid authentication session. Please sign up or sign in again.';
      setError(errorMessage);
    }
    
    // Clear URL parameters after handling
    if (errorParam || messageParam) {
      const newUrl = window.location.pathname + (mode ? `?mode=${mode}` : '');
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  // Scroll animation refs
  const [heroRef, heroVisible] = useScrollAnimation();
  const [statsRef, statsVisible] = useScrollAnimation();
  const [whatIsRef, whatIsVisible] = useScrollAnimation();
  const [caraKerjaRef, caraKerjaVisible] = useScrollAnimation();
  const [keuntunganRef, keuntunganVisible] = useScrollAnimation();

  // Enhanced email validation
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Enhanced password validation
  const validatePassword = (password) => {
    const minLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    
    return {
      isValid: minLength && hasUpperCase && hasLowerCase && hasNumbers,
      minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Enhanced validation for both login and signup
      if (!email.trim()) {
        setError('Email is required');
        return;
      }

      if (!validateEmail(email)) {
        setError('Please enter a valid email address');
        return;
      }

      if (!password) {
        setError('Password is required');
        return;
      }

      if (isSignup) {
        // Enhanced signup validation
        if (!name.trim()) {
          setError('Full name is required');
          return;
        }

        if (name.trim().length < 2) {
          setError('Name must be at least 2 characters long');
          return;
        }

        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
          let errorMsg = 'Password must contain:';
          if (!passwordValidation.minLength) errorMsg += ' at least 8 characters,';
          if (!passwordValidation.hasUpperCase) errorMsg += ' uppercase letter,';
          if (!passwordValidation.hasLowerCase) errorMsg += ' lowercase letter,';
          if (!passwordValidation.hasNumbers) errorMsg += ' number,';
          setError(errorMsg.slice(0, -1)); // Remove trailing comma
          return;
        }

        if (password !== confirmPassword) {
          setError('Passwords do not match');
          return;
        }

        // Attempt signup with enhanced error handling
        const { data, error } = await signUp(email.trim().toLowerCase(), password, { 
          name: name.trim() 
        });
        
        if (error) {
          // Enhanced error messages for better UX
          if (error.message.includes('already registered')) {
            setError('An account with this email already exists. Please try logging in instead.');
          } else if (error.message.includes('invalid email')) {
            setError('Please enter a valid email address');
          } else if (error.message.includes('weak password')) {
            setError('Password is too weak. Please choose a stronger password.');
          } else {
            setError(error.message || 'Failed to create account. Please try again.');
          }
        } else if (data.user) {
          // Show success message for signup
          setError('');
          setSuccessMessage('Account created successfully! Please check your email to verify your account.');
          // Note: User will be redirected by useEffect when user state updates
        }
      } else {
        // Enhanced login validation and error handling
        const { data, error } = await signInWithEmail(email.trim().toLowerCase(), password);
        
        if (error) {
          // Enhanced error messages for login
          if (error.message.includes('Invalid login credentials')) {
            setError('Invalid email or password. Please check your credentials and try again.');
          } else if (error.message.includes('Email not confirmed')) {
            setError('Please check your email and click the confirmation link before logging in.');
          } else if (error.message.includes('too many requests')) {
            setError('Too many login attempts. Please wait a few minutes before trying again.');
          } else {
            setError(error.message || 'Login failed. Please try again.');
          }
        } else if (data.user) {
          // User will be redirected by useEffect when user state updates
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleAuth = async (mode = 'signup') => {
    setError('');
    setSuccessMessage('');
    setIsSubmitting(true);
    
    try {
      // Untuk mode signin, kita akan melakukan validasi setelah Google OAuth berhasil
      // Karena kita perlu email dari Google terlebih dahulu
      
      if (mode === 'signin') {
        setSuccessMessage('Checking account and signing in...');
      } else {
        // Mode signup
        setSuccessMessage('Creating new account with Google...');
      }
      
      // Store mode in sessionStorage untuk digunakan di callback
      sessionStorage.setItem('auth_mode', mode);
      
      const { error } = await signInWithGoogle(mode);
      if (error) {
        // Enhanced error handling for Google OAuth
        if (error.message.includes('popup_closed_by_user')) {
          setError(`Google ${mode} was cancelled. Please try again.`);
        } else if (error.message.includes('access_denied')) {
          setError('Access denied. Please grant permission to continue with Google.');
        } else if (error.message.includes('network')) {
          setError('Network error. Please check your connection and try again.');
        } else if (error.message.includes('invalid_request')) {
          setError('Invalid request. Please try again or contact support if the problem persists.');
        } else if (error.message.includes('temporarily_unavailable')) {
          setError('Google authentication is temporarily unavailable. Please try again in a few minutes.');
        } else if (error.message.includes('redirect_uri_mismatch')) {
          setError('Configuration error. Please contact support - redirect URI mismatch.');
        } else if (error.message.includes('invalid_client')) {
          setError('Configuration error. Please contact support - invalid client configuration.');
        } else {
          setError(error.message || `Google ${mode} failed. Please try again.`);
        }
      }
      // Note: Success will be handled by the auth state change listener or callback page
    } catch (err) {
      setError(`Google ${mode} failed. Please try again or use email ${mode}.`);
    } finally {
      // Don't set loading to false immediately for successful redirects
      setTimeout(() => setIsSubmitting(false), 1000);
    }
  };

  const toggleAuthMode = () => {
    setIsSignup(!isSignup);
    setError('');
    setSuccessMessage('');
    setName('');
    setConfirmPassword('');
  };

  return (
    <div className="min-h-screen bg-[#020203] text-white overflow-x-hidden selection:bg-pink-500/30 font-sans relative">
      
      {/* --- GLOBAL AMBIENT BACKGROUND (PINK & PURPLE GRADIENTS) --- */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* 1. Top Left - Deep Purple Aura */}
        <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vh] bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.15)_0%,rgba(0,0,0,0)_70%)] blur-[100px]" />
        
        {/* 2. Top Right - Soft Pink/Magenta Aura */}
        <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[60vh] bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.15)_0%,rgba(0,0,0,0)_70%)] blur-[100px]" />
        
        {/* 3. Bottom Center - Wide Purple Glow to blend footer */}
        <div className="absolute bottom-[-20%] left-1/2 -translate-x-1/2 w-[80vw] h-[50vh] bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.1)_0%,rgba(0,0,0,0)_70%)] blur-[120px]" />

        {/* 4. Middle Floating Accent - Very Subtle Rose */}
        <div className="absolute top-[40%] left-[20%] w-[30vw] h-[30vh] bg-[radial-gradient(circle_at_center,rgba(244,114,182,0.08)_0%,rgba(0,0,0,0)_60%)] blur-[80px]" />
      </div>

      {/* --- Navbar --- */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#020203]/70 backdrop-blur-xl border-b border-white/5 transition-all duration-300">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between h-20">
            <Link to="/" className="group">
              <Logo size="md" showText={true} textClassName="text-lg font-bold tracking-tight" />
            </Link>

            <div className="hidden md:flex items-center gap-10">
              <a href="#what-is" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">What is?</a>
              <a href="#cara-kerja" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Cara Kerja</a>
              <a href="#keuntungan" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Keuntungan</a>
            </div>

            <a 
              href="#get-started"
              className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-2 backdrop-blur-md hover:shadow-lg hover:shadow-pink-500/10 transform hover:-translate-y-0.5"
            >
              Get Started
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </div>
        </div>
      </nav>

      {/* --- Hero Section --- */}
      <section className="relative pt-48 pb-32 min-h-screen flex items-center justify-center z-10">
        <div 
          ref={heroRef}
          className={`relative max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12 text-center w-full transition-all duration-1000 ${
            heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-gray-300 mb-8 animate-fade-in-up hover:bg-white/10 transition-colors cursor-default backdrop-blur-md shadow-sm ring-1 ring-white/5 hover:ring-pink-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
            </span>
            <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">Versi 2.0 Kini Tersedia</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.1] mb-8 tracking-tight text-white">
            Transformasi User Story ke <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-300 animate-gradient bg-[length:200%_auto]">
              Gherkin Backlog
            </span>
          </h1>
          
          <p className="text-gray-400 text-lg sm:text-xl max-w-2xl mx-auto mb-16 leading-relaxed font-light">
            Otomatisasi pembuatan skenario testing (Given-When-Then) dengan AI canggih. 
            Hemat waktu QA tim Anda hingga 80% dengan dokumentasi yang terstandarisasi.
          </p>

          {/* AI Icon Circle Animation */}
          <div className="relative w-48 h-48 mx-auto mb-12 group cursor-pointer perspective-1000">
            <div className="absolute inset-0 rounded-full border border-purple-500/20 animate-[spin_10s_linear_infinite]" />
            <div className="absolute inset-4 rounded-full border border-pink-500/20 animate-[spin_15s_linear_infinite_reverse]" />
            
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 to-pink-500/20 rounded-full blur-2xl group-hover:blur-3xl transition-all duration-500 opacity-60" />
            
            <div className="absolute inset-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-2xl shadow-purple-500/30 group-hover:shadow-purple-500/50 transition-all duration-500 group-hover:scale-105 transform z-10 border border-white/10">
              <span className="text-3xl font-bold text-white drop-shadow-md">AI</span>
            </div>

            {[
                { icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", color: "text-purple-200", delay: "0ms", pos: "-top-2 left-1/2 -translate-x-1/2", bg: "from-purple-500/20 to-transparent" },
                { icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z", color: "text-pink-200", delay: "1000ms", pos: "top-1/2 -right-2 -translate-y-1/2", bg: "from-pink-500/20 to-transparent" },
                { icon: "M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", color: "text-purple-200", delay: "2000ms", pos: "-bottom-2 left-1/2 -translate-x-1/2", bg: "from-purple-600/20 to-transparent" },
                { icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15", color: "text-pink-200", delay: "3000ms", pos: "top-1/2 -left-2 -translate-y-1/2", bg: "from-pink-600/20 to-transparent" }
            ].map((item, idx) => (
                <div key={idx} className={`absolute ${item.pos} w-10 h-10 rounded-xl bg-gradient-to-br ${item.bg} bg-[#020203] border border-white/10 flex items-center justify-center shadow-lg animate-float z-20 backdrop-blur-sm`} style={{ animationDelay: item.delay }}>
                    <svg className={`w-5 h-5 ${item.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} /></svg>
                </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- Stats & Login Section --- */}
      <section id="get-started" className="py-32 relative z-10">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12 relative">
          <div 
            ref={statsRef}
            className={`grid lg:grid-cols-2 gap-20 items-center transition-all duration-1000 ${
              statsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            {/* Left - Content */}
            <div className={`transition-all duration-700 delay-200 ${statsVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold tracking-wide mb-8 uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                Powered by AI
              </div>
              
              <h2 className="text-4xl sm:text-5xl font-bold mb-6 leading-tight tracking-tight text-white">
                Konversi User Story <br/>
                dalam <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-pink-300">Hitungan Detik</span>
              </h2>
              <p className="text-gray-400 mb-12 text-lg font-light leading-relaxed max-w-lg">
                Platform cerdas untuk mempercepat workflow QA dan Development team Anda tanpa kompromi pada kualitas.
              </p>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-8 mb-12 border-y border-white/5 py-8">
                <div>
                  <div className="text-3xl font-bold text-white mb-1">
                    <AnimatedCounter end={99} suffix="%" />
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider font-medium">Akurasi</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white mb-1">&lt;10s</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider font-medium">Kecepatan</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white mb-1">
                    <AnimatedCounter end={500} suffix="+" />
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider font-medium">Pengguna</div>
                </div>
              </div>

              {/* Features List */}
              <div className="space-y-4">
                {[
                  'Template Gherkin yang dapat dikustomisasi penuh',
                  'Export langsung ke Excel / Spreadsheet',
                  'Analisis kelayakan user story otomatis'
                ].map((feature, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-4 text-sm text-gray-300 group"
                    style={{ transitionDelay: `${index * 100}ms` }}
                  >
                    <div className="w-6 h-6 rounded-full bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors border border-purple-500/10">
                      <svg className="w-3.5 h-3.5 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="group-hover:text-white transition-colors">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right - Login Form */}
            <div className={`flex justify-center lg:justify-end transition-all duration-700 delay-400 ${statsVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'} relative`}>
               
               {/* Card Glow - Purple/Pink mix */}
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] bg-[radial-gradient(circle,_var(--tw-gradient-stops))] from-purple-600/20 via-pink-500/10 to-transparent blur-[50px] pointer-events-none"></div>

               {/* Glass Card Container */}
               <div className="w-full max-w-[500px] bg-[#0a0a0f]/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 sm:p-10 shadow-2xl relative overflow-hidden group hover:border-purple-500/20 transition-colors duration-500">
                  
                  <div className="text-center mb-8 relative">
                     <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-500/10 to-pink-500/10 border border-white/10 mb-5 shadow-lg shadow-purple-500/5">
                        <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                           <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                        </svg>
                     </div>
                     <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">
                       {isSignup ? 'Buat Akun Baru' : 'Masuk ke Akun'}
                     </h3>
                     <p className="text-gray-400 text-sm">
                       {isSignup ? 'Bergabung dengan SpecWeave untuk mulai membuat scenarios' : 'Masuk ke akun SpecWeave yang sudah ada'}
                     </p>
                  </div>


                  {!isSignup && (
                    <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-500/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <span className="text-yellow-400 font-medium text-sm">Perhatian</span>
                      </div>
                      <p className="text-yellow-300 text-sm">
                        Anda hanya bisa sign in jika sudah pernah membuat akun sebelumnya. 
                        Jika belum punya akun, silakan <button 
                          onClick={toggleAuthMode} 
                          className="underline hover:text-yellow-200 font-medium"
                        >
                          daftar terlebih dahulu
                        </button>.
                      </p>
                    </div>
                  )}

                  {/* Info untuk Sign Up mode */}
                  {isSignup && (
                    <div className="mb-6 p-4 bg-green-900/20 border border-green-500/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-green-400 font-medium text-sm">Selamat Datang!</span>
                      </div>
                      <p className="text-green-300 text-sm">
                        Buat akun baru untuk mulai menggunakan SpecWeave. 
                        Gratis dan mudah - hanya butuh beberapa detik!
                      </p>
                    </div>
                  )}
                  {error && (
                    <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-lg">
                      <p className="text-red-400 text-sm">{error}</p>
                    </div>
                  )}

                  {/* Success Message */}
                  {successMessage && (
                    <div className="mb-6 p-4 bg-green-900/20 border border-green-500/50 rounded-lg">
                      <p className="text-green-400 text-sm">{successMessage}</p>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                    {isSignup && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-gray-400 ml-1 uppercase tracking-wider">Nama Lengkap</label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-500 group-focus-within:text-purple-400 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => {
                              setName(e.target.value);
                              setError('');
                              setSuccessMessage('');
                            }}
                            placeholder="Nama lengkap Anda"
                            className="w-full pl-12 pr-4 py-3.5 bg-[#050507] border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:bg-[#0c0c12] focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 text-sm font-medium"
                            disabled={isSubmitting || loading}
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-gray-400 ml-1 uppercase tracking-wider">Email</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-gray-500 group-focus-within:text-purple-400 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                          </svg>
                        </div>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            setError('');
                            setSuccessMessage('');
                          }}
                          placeholder="nama@perusahaan.com"
                          className="w-full pl-12 pr-4 py-3.5 bg-[#050507] border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:bg-[#0c0c12] focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 text-sm font-medium"
                          disabled={isSubmitting || loading}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-gray-400 ml-1 uppercase tracking-wider">Password</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-gray-500 group-focus-within:text-purple-400 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            setError('');
                            setSuccessMessage('');
                          }}
                          placeholder="••••••••"
                          className="w-full pl-12 pr-12 py-3.5 bg-[#050507] border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:bg-[#0c0c12] focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 text-sm font-medium"
                          disabled={isSubmitting || loading}
                          required
                        />
                        <button 
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-white transition-colors focus:outline-none"
                          disabled={isSubmitting || loading}
                        >
                          {showPassword ? (
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          ) : (
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                      {isSignup && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500 mb-2">
                            Password must contain:
                          </p>
                          <div className="space-y-1">
                            <div className={`flex items-center gap-2 text-xs ${password.length >= 8 ? 'text-green-400' : 'text-gray-500'}`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${password.length >= 8 ? 'bg-green-400' : 'bg-gray-600'}`} />
                              At least 8 characters
                            </div>
                            <div className={`flex items-center gap-2 text-xs ${/[A-Z]/.test(password) ? 'text-green-400' : 'text-gray-500'}`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${/[A-Z]/.test(password) ? 'bg-green-400' : 'bg-gray-600'}`} />
                              Uppercase letter
                            </div>
                            <div className={`flex items-center gap-2 text-xs ${/[a-z]/.test(password) ? 'text-green-400' : 'text-gray-500'}`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${/[a-z]/.test(password) ? 'bg-green-400' : 'bg-gray-600'}`} />
                              Lowercase letter
                            </div>
                            <div className={`flex items-center gap-2 text-xs ${/\d/.test(password) ? 'text-green-400' : 'text-gray-500'}`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${/\d/.test(password) ? 'bg-green-400' : 'bg-gray-600'}`} />
                              Number
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {isSignup && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-gray-400 ml-1 uppercase tracking-wider">Konfirmasi Password</label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-500 group-focus-within:text-purple-400 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          </div>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => {
                              setConfirmPassword(e.target.value);
                              setError('');
                              setSuccessMessage('');
                            }}
                            placeholder="••••••••"
                            className="w-full pl-12 pr-4 py-3.5 bg-[#050507] border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:bg-[#0c0c12] focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 text-sm font-medium"
                            disabled={isSubmitting || loading}
                            required
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting || loading}
                      className="block w-full py-3.5 mt-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-center font-bold text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:opacity-90 transition-all duration-300 transform hover:-translate-y-0.5 active:scale-[0.98] text-sm tracking-wide border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                          {isSignup ? 'Membuat Akun...' : 'Masuk...'}
                        </div>
                      ) : (
                        <>
                          {isSignup ? 'Buat Akun Baru' : 'Masuk ke Akun'}
                          <svg className="w-4 h-4 inline-block ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                          </svg>
                        </>
                      )}
                    </button>

                    {!isSignup && (
                      <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
                          <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors group select-none">
                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${rememberMe ? 'bg-purple-600 border-purple-600' : 'border-gray-600 bg-transparent group-hover:border-gray-400'}`}>
                                  {rememberMe && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                              </div>
                              <input type="checkbox" className="hidden" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
                              <span>Remember me</span>
                          </label>
                          <a href="#" className="hover:text-purple-400 transition-colors font-medium">Lupa password?</a>
                      </div>
                    )}

                    <div className="relative py-3">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/10"></div>
                      </div>
                      <div className="relative flex justify-center">
                        <span className="px-3 bg-[#0a0a0f] text-[10px] uppercase tracking-widest text-gray-500 font-bold">atau lanjutkan dengan</span>
                      </div>
                    </div>

                    {/* Google Sign Up Button (for signup mode) */}
                    {isSignup && (
                      <button 
                        type="button"
                        onClick={() => handleGoogleAuth('signup')}
                        disabled={loading || isSubmitting}
                        className="w-full py-3 bg-white hover:bg-gray-100 text-black rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-3 shadow-lg transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      >
                        {isSubmitting ? (
                          <div className="flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin mr-2"></div>
                            Creating account...
                          </div>
                        ) : (
                          <>
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                            <span>Sign Up with Google</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Google Sign In Button (for login mode) */}
                    {!isSignup && (
                      <button 
                        type="button"
                        onClick={() => handleGoogleAuth('signin')}
                        disabled={loading || isSubmitting}
                        className="w-full py-3 bg-white hover:bg-gray-100 text-black rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-3 shadow-lg transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      >
                        {isSubmitting ? (
                          <div className="flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin mr-2"></div>
                            Signing in...
                          </div>
                        ) : (
                          <>
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                            <span>Sign In with Google</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Auth Mode Toggle */}
                    <div className="text-center pt-4">
                      <p className="text-gray-400 text-sm">
                        {isSignup ? 'Sudah punya akun SpecWeave?' : 'Belum punya akun SpecWeave?'}{' '}
                        <button
                          type="button"
                          onClick={toggleAuthMode}
                          className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
                          disabled={isSubmitting || loading}
                        >
                          {isSignup ? 'Masuk ke akun yang ada' : 'Buat akun baru'}
                        </button>
                      </p>
                    </div>
                  </form>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- What Is Section --- */}
      <section id="what-is" className="py-32 relative z-10">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div 
            ref={whatIsRef}
            className={`text-center mb-24 transition-all duration-1000 ${
              whatIsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white">Apa itu SpecWeave?</h2>
            <p className="text-gray-400 text-lg font-light max-w-2xl mx-auto">Pahami konsep dasar BDD dan bagaimana AI kami mengoptimalkan proses pengujian Anda.</p>
          </div>

          <div className={`grid lg:grid-cols-2 gap-12 mb-24 transition-all duration-700 delay-200 ${whatIsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            {/* Card Left - Purple/Pink Theme */}
            <div className="bg-[#0a0a0f]/60 backdrop-blur-lg rounded-3xl border border-white/5 overflow-hidden hover:border-purple-500/30 transition-all duration-500 shadow-2xl hover:shadow-purple-500/5 group">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5 bg-[#0c0c12]/50">
                <div className="flex gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                </div>
                <span className="text-xs font-mono text-gray-500 ml-2">user_story_template.md</span>
              </div>
              
              <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 text-purple-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <span className="text-purple-400 font-semibold text-sm tracking-wide uppercase">Format Standar</span>
                </div>
                
                <div className="bg-[#050507] rounded-xl p-6 mb-6 border border-white/5 shadow-inner">
                  <div className="font-mono text-sm space-y-3">
                    <div className="flex gap-3"><span className="text-purple-400 font-bold">As a</span> <span className="text-gray-400 border-b border-dashed border-gray-700 pb-0.5">[role]</span></div>
                    <div className="flex gap-3"><span className="text-purple-400 font-bold">I want</span> <span className="text-gray-400 border-b border-dashed border-gray-700 pb-0.5">[feature]</span></div>
                    <div className="flex gap-3"><span className="text-purple-400 font-bold">So that</span> <span className="text-gray-400 border-b border-dashed border-gray-700 pb-0.5">[benefit]</span></div>
                  </div>
                </div>

                <div className="bg-[#1a1a2e]/30 rounded-xl p-5 border border-purple-500/10 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-purple-500/50"></div>
                  <div className="text-[10px] text-gray-500 mb-2 uppercase tracking-wider font-semibold">Contoh Nyata</div>
                  <div className="text-sm leading-relaxed text-gray-300">
                    <span className="text-purple-400 font-medium">As a</span> customer, <br/>
                    <span className="text-purple-400 font-medium">I want</span> to reset my password, <br/>
                    <span className="text-purple-400 font-medium">So that</span> I can regain access to my account.
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center pl-4">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center border border-purple-500/20">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">User Story</h3>
                  <div className="h-1 w-10 bg-purple-500 rounded-full mt-1"></div>
                </div>
              </div>
              
              <p className="text-gray-400 mb-8 leading-relaxed text-lg font-light">
                User Story adalah jembatan komunikasi antara pengguna dan pengembang. 
                Deskripsi naratif sederhana yang fokus pada nilai bisnis fitur tersebut.
              </p>
              
              <ul className="space-y-6">
                {[
                  { title: 'Template yang Fleksibel', desc: 'Sesuaikan format agar sesuai dengan gaya agile tim Anda' },
                  { title: 'Standar Industri Global', desc: 'Format yang digunakan oleh tim engineering top dunia' },
                  { title: 'Kejelasan Komunikasi', desc: 'Mengurangi ambiguitas antara PM, Designer, dan Developer' }
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-4 group hover:translate-x-2 transition-transform duration-300">
                    <div className="w-8 h-8 rounded-full bg-[#1a1a2e] border border-white/10 flex items-center justify-center flex-shrink-0 group-hover:border-purple-500/30 transition-colors">
                      <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-bold text-white mb-1">{item.title}</div>
                      <div className="text-sm text-gray-500 leading-relaxed">{item.desc}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className={`grid lg:grid-cols-2 gap-12 transition-all duration-700 delay-400 ${whatIsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="flex flex-col justify-center order-2 lg:order-1 pr-4">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center border border-pink-500/20">
                  <svg className="w-6 h-6 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">Format Gherkin</h3>
                  <div className="h-1 w-10 bg-pink-500 rounded-full mt-1"></div>
                </div>
              </div>
              
              <p className="text-gray-400 mb-8 leading-relaxed text-lg font-light">
                Bahasa domain-specific yang menjembatani spesifikasi teknis dengan bahasa manusia. 
                Memungkinkan otomatisasi testing (BDD) berjalan mulus.
              </p>
              
              <ul className="space-y-6">
                {[
                  { title: 'Konversi AI Instan', desc: 'Ubah narasi menjadi logika Given-When-Then dalam detik' },
                  { title: 'Integrasi Test Suite', desc: 'Langsung dapat digunakan pada Cucumber, SpecFlow, dll' },
                  { title: 'Dokumentasi Hidup', desc: 'Spesifikasi yang selalu update dengan kode program' }
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-4 group hover:translate-x-2 transition-transform duration-300">
                    <div className="w-8 h-8 rounded-full bg-[#1a1a2e] border border-white/10 flex items-center justify-center flex-shrink-0 group-hover:border-pink-500/30 transition-colors">
                      <svg className="w-4 h-4 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-bold text-white mb-1">{item.title}</div>
                      <div className="text-sm text-gray-500 leading-relaxed">{item.desc}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-[#0a0a0f]/60 backdrop-blur-lg rounded-3xl border border-white/5 overflow-hidden hover:border-pink-500/30 transition-all duration-500 shadow-2xl hover:shadow-pink-500/5 order-1 lg:order-2 group">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5 bg-[#0c0c12]/50">
                <div className="flex gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                </div>
                <span className="text-xs font-mono text-gray-500 ml-2">login.feature</span>
              </div>
              
              <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center border border-pink-500/20 text-pink-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  </div>
                  <span className="text-pink-400 font-semibold text-sm tracking-wide uppercase">BDD Scenario</span>
                </div>
                
                <div className="bg-[#050507] rounded-xl p-6 mb-6 border border-white/5 shadow-inner font-mono text-sm leading-relaxed">
                  <div className="text-gray-500 mb-4 border-b border-white/5 pb-2">Feature: Password Reset Functionality</div>
                  <div className="text-purple-400 mb-2 font-semibold">Scenario: <span className="text-gray-300 font-normal">User successfully requests reset</span></div>
                  <div className="pl-4 border-l-2 border-gray-800 space-y-2">
                    <div><span className="text-pink-500 font-bold">Given </span><span className="text-gray-400">user is on the login page</span></div>
                    <div><span className="text-yellow-500 font-bold">When </span><span className="text-gray-400">user clicks "Forgot Password"</span></div>
                    <div><span className="text-yellow-500 font-bold">And </span><span className="text-gray-400">enters valid email address</span></div>
                    <div><span className="text-green-500 font-bold">Then </span><span className="text-gray-400">system sends recovery email</span></div>
                  </div>
                </div>

                <div className="bg-green-900/10 border border-green-500/20 rounded-xl px-5 py-3 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                  <span className="text-green-400 text-xs font-bold uppercase tracking-wider">Valid Syntax</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- Cara Kerja Section (UPDATED - REDESIGNED) --- */}
      <section id="cara-kerja" className="py-32 relative overflow-hidden z-10">
        
        {/* Background Gradient for Connection - FADING TO TRANSPARENT */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[400px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/10 via-pink-900/5 to-transparent blur-[80px] pointer-events-none" />

        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12 relative z-10">
          <div 
            ref={caraKerjaRef}
            className={`text-center mb-20 transition-all duration-1000 ${
              caraKerjaVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white">Cara Kerja</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">Tiga langkah sederhana untuk mengkonversi user story menjadi Gherkin backlog</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connector Line (Desktop) - Gradient adjusted to fade out at ends */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-y-1/2 z-0" />

            {/* Step 1 */}
            <div className={`relative group ${caraKerjaVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'} transition-all duration-700 delay-200`}>
              <div className="relative z-10 bg-[#12121a]/40 backdrop-blur-md rounded-[2rem] border border-white/5 p-8 hover:border-purple-500/30 transition-all duration-500 h-full group-hover:-translate-y-2 shadow-lg hover:shadow-purple-500/10 overflow-hidden">
                {/* Subtle inner gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* Step Number Background */}
                <div className="absolute top-6 right-6 text-5xl font-bold text-white/10 leading-none select-none pointer-events-none font-sans">01</div>
                
                {/* Icon */}
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-6 border border-purple-500/20 group-hover:scale-110 transition-transform duration-500 shadow-[0_0_15px_rgba(168,85,247,0.2)] relative z-10">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>

                <h3 className="text-xl font-bold mb-3 text-white relative z-10">Input User Story</h3>
                <p className="text-gray-400 text-sm leading-relaxed relative z-10">
                  Masukkan satu atau banyak user story sekaligus. Kami mendukung format teks bebas maupun template standar.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className={`relative group ${caraKerjaVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'} transition-all duration-700 delay-400`}>
              <div className="relative z-10 bg-[#12121a]/40 backdrop-blur-md rounded-[2rem] border border-white/5 p-8 hover:border-pink-500/30 transition-all duration-500 h-full group-hover:-translate-y-2 shadow-lg hover:shadow-pink-500/10 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="absolute top-6 right-6 text-5xl font-bold text-white/10 leading-none select-none pointer-events-none font-sans">02</div>
                
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center mb-6 border border-pink-500/20 group-hover:scale-110 transition-transform duration-500 shadow-[0_0_15px_rgba(236,72,153,0.2)] relative z-10">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>

                <h3 className="text-xl font-bold mb-3 text-white relative z-10">AI Processing</h3>
                <p className="text-gray-400 text-sm leading-relaxed relative z-10">
                  Engine AI kami menganalisis konteks, peran, dan tujuan untuk menghasilkan skenario Gherkin yang valid.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className={`relative group ${caraKerjaVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'} transition-all duration-700 delay-600`}>
              <div className="relative z-10 bg-[#12121a]/40 backdrop-blur-md rounded-[2rem] border border-white/5 p-8 hover:border-purple-500/30 transition-all duration-500 h-full group-hover:-translate-y-2 shadow-lg hover:shadow-purple-500/10 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="absolute top-6 right-6 text-5xl font-bold text-white/10 leading-none select-none pointer-events-none font-sans">03</div>
                
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-6 border border-purple-500/20 group-hover:scale-110 transition-transform duration-500 shadow-[0_0_15px_rgba(168,85,247,0.2)] relative z-10">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>

                <h3 className="text-xl font-bold mb-3 text-white relative z-10">Review & Export</h3>
                <p className="text-gray-400 text-sm leading-relaxed relative z-10">
                  Dapatkan hasilnya secara instan. Salin ke clipboard atau export ke file Excel/CSV untuk dokumentasi tim.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- Keuntungan Section (UPDATED - PREMIUM DESIGN) --- */}
      <section id="keuntungan" className="py-32 relative overflow-hidden z-10">
        {/* Background Glow Elements - RADIAL GRADIENT TO TRANSPARENT */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[1200px] h-[600px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/10 via-transparent to-transparent rounded-full blur-[100px] pointer-events-none"></div>
        
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12 relative z-10">
          <div 
            ref={keuntunganRef}
            className={`text-center mb-20 transition-all duration-1000 ${
              keuntunganVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white">Keuntungan SpecWeave</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Tingkatkan produktivitas tim QA Anda dengan fitur-fitur unggulan kami yang dirancang untuk kecepatan dan akurasi.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {[
              {
                icon: (
                  <svg className="w-8 h-8 text-purple-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                colorFrom: 'from-purple-500/20',
                colorTo: 'to-purple-900/5',
                border: 'group-hover:border-purple-500/30',
                shadow: 'group-hover:shadow-purple-500/10',
                title: 'Hemat Waktu',
                desc: 'Otomatisasi proses manual yang memakan waktu, hasilkan skenario dalam hitungan detik.'
              },
              {
                icon: (
                  <svg className="w-8 h-8 text-purple-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                colorFrom: 'from-purple-500/20',
                colorTo: 'to-purple-900/5',
                border: 'group-hover:border-purple-500/30',
                shadow: 'group-hover:shadow-purple-500/10',
                title: 'Konsistensi Tinggi',
                desc: 'Pastikan setiap backlog mengikuti format standar industri yang sama tanpa kesalahan manusia.'
              },
              {
                icon: (
                  <svg className="w-8 h-8 text-pink-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                ),
                colorFrom: 'from-pink-500/20',
                colorTo: 'to-pink-900/5',
                border: 'group-hover:border-pink-500/30',
                shadow: 'group-hover:shadow-pink-500/10',
                title: 'Template Custom',
                desc: 'Fleksibilitas penuh untuk menyesuaikan struktur output dengan kebutuhan unik tim Anda.'
              },
              {
                icon: (
                  <svg className="w-8 h-8 text-pink-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                ),
                colorFrom: 'from-pink-500/20',
                colorTo: 'to-pink-900/5',
                border: 'group-hover:border-pink-500/30',
                shadow: 'group-hover:shadow-pink-500/10',
                title: 'Export Mudah',
                desc: 'Unduh hasil konversi langsung ke format Excel atau CSV untuk dokumentasi instan.'
              }
            ].map((item, index) => (
              <div 
                key={index}
                className={`bg-[#12121a]/50 backdrop-blur-sm rounded-2xl border border-white/5 p-8 transition-all duration-500 group cursor-default hover:-translate-y-2 ${item.border} hover:shadow-xl ${item.shadow} ${
                  keuntunganVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}
                style={{ transitionDelay: `${200 + index * 100}ms` }}
              >
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.colorFrom} ${item.colorTo} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 border border-white/5`}>
                  {item.icon}
                </div>
                <h3 className="font-bold text-xl mb-3 text-white group-hover:text-white transition-colors">{item.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="border-t border-white/10 py-16 mt-16 bg-[#020203] relative z-10">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="grid md:grid-cols-3 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Logo size="md" showText={false} />
                <div>
                  <div className="font-semibold">SpecWeave</div>
                  <div className="text-xs text-gray-500">User Story to Backlog Converter</div>
                </div>
              </div>
              <p className="text-sm text-gray-400">
                Konversi user story menjadi format Gherkin (Given-When-Then) secara otomatis dengan AI.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><a href="#get-started" className="text-sm text-gray-400 hover:text-white transition-colors">Get Started</a></li>
                <li><a href="#what-is" className="text-sm text-gray-400 hover:text-white transition-colors">What is?</a></li>
                <li><a href="#cara-kerja" className="text-sm text-gray-400 hover:text-white transition-colors">Cara Kerja</a></li>
                <li><a href="#keuntungan" className="text-sm text-gray-400 hover:text-white transition-colors">Keuntungan</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <div className="flex gap-3">
                <a href="#" className="w-10 h-10 rounded-lg bg-[#12121a] border border-white/10 flex items-center justify-center hover:border-purple-500/50 transition-colors">
                  <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-lg bg-[#12121a] border border-white/10 flex items-center justify-center hover:border-purple-500/50 transition-colors">
                  <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-lg bg-[#12121a] border border-white/10 flex items-center justify-center hover:border-purple-500/50 transition-colors">
                  <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
            <p>© 2025 SpecWeave Inc. All rights reserved.</p>
            <div className="flex gap-8">
              <a href="#" className="hover:text-gray-300 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-gray-300 transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;