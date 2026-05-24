import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../components/common/Logo';
import FormatGuide from '../components/chat/FormatGuide';
import { getCurrentLLMInfo, getLLMConfig } from '../utils/helpers/llmHelpers';
import toast from 'react-hot-toast';

const Landing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [userStory, setUserStory] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showFormatGuide, setShowFormatGuide] = useState(false);
  const [showAIDropdown, setShowAIDropdown] = useState(false);

  // Get current AI model info
  const llmInfo = getCurrentLLMInfo();
  const llmConfig = getLLMConfig();
  const availableModels = llmConfig.availableModels.filter(m => m.isAvailable);

  // Real template data from TemplateModal (1 per category)
  const categories = ['All', 'Authentication', 'User Management', 'E-commerce', 'Reporting', 'Communication'];
  
  const sampleStories = [
    {
      id: 1,
      title: 'User Login with Email & Password',
      category: 'Authentication',
      description: 'Sebagai pengguna yang sudah terdaftar, saya ingin login ke aplikasi menggunakan email dan password saya agar dapat mengakses dashboard dan fitur-fitur yang tersedia di dalam aplikasi.',
      tags: ['login', 'authentication', 'security']
    },
    {
      id: 2,
      title: 'User Profile Management',
      category: 'User Management',
      description: 'Sebagai pengguna, saya ingin mengedit profil saya (nama, email, foto profil) agar informasi akun saya selalu terkini dan sesuai dengan identitas saya.',
      tags: ['profile', 'user', 'edit']
    },
    {
      id: 3,
      title: 'Product Catalog with Search',
      category: 'E-commerce',
      description: 'Sebagai customer, saya ingin melihat katalog produk dengan fitur pencarian dan filter (kategori, harga, rating) agar dapat menemukan produk yang sesuai dengan kebutuhan saya.',
      tags: ['product', 'catalog', 'search']
    },
    {
      id: 4,
      title: 'Sales Analytics Dashboard',
      category: 'Reporting',
      description: 'Sebagai business manager, saya ingin melihat laporan penjualan dalam bentuk grafik dan chart (harian, mingguan, bulanan) agar dapat menganalisis performa bisnis dan membuat keputusan strategis.',
      tags: ['analytics', 'dashboard', 'sales']
    },
    {
      id: 5,
      title: 'Real-time Notification System',
      category: 'Communication',
      description: 'Sebagai pengguna aplikasi, saya ingin menerima notifikasi penting (pesanan baru, pembayaran berhasil, promo) melalui email dan push notification agar selalu terinformasi tentang aktivitas terkini.',
      tags: ['notification', 'realtime', 'email']
    }
  ];

  const filteredStories = selectedCategory === 'All' 
    ? sampleStories 
    : sampleStories.filter(story => story.category === selectedCategory);

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/chat', { replace: true });
    }
  }, [user, navigate]);

  const handleGetStarted = () => {
    if (user) {
      navigate('/chat');
    } else {
      navigate('/login');
    }
  };

  const handleGenerate = () => {
    if (!userStory.trim()) {
      alert('Silakan masukkan user story terlebih dahulu');
      return;
    }
    // Navigate to chat with user story
    if (user) {
      navigate('/chat', { state: { initialMessage: userStory } });
    } else {
      // Redirect to login with the user story
      navigate('/login', { state: { initialMessage: userStory } });
    }
  };

  // Insert template function (from ChatInput)
  const insertTemplate = (template) => {
    if (template) {
      setUserStory(template);
    } else {
      setUserStory("Sebagai [peran], saya ingin [fitur], agar [manfaat]");
    }
    setShowFormatGuide(false);
  };

  // Handle story card click
  const handleStoryClick = (story) => {
    setUserStory(story.description);
  };

  return (
    <div className="min-h-screen bg-[#020203] text-white overflow-x-hidden flex flex-col">
      {/* Background gradients - sama dengan Dashboard */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vh] bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.08)_0%,rgba(0,0,0,0)_70%)] blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vh] bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.08)_0%,rgba(0,0,0,0)_70%)] blur-[100px]" />
      </div>

      {/* Navbar - sama dengan Dashboard */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-2xl">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between h-20">
            <div className="-ml-4">
              <Logo size="xl" showText={false} />
            </div>
            
            <button 
              onClick={handleGetStarted}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center gap-2 border"
              style={{ backgroundColor: '#160D14', borderColor: '#44273D', color: '#FF7AD0' }}
            >
              Get Started
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#FF7AD0' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 pt-32 pb-20 flex-1">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-5xl sm:text-6xl font-bold mb-6 leading-tight">
              Punya User Story?
            </h1>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
              Ubah user story jadi <span style={{ color: '#C27AFF' }}>skenario testing lengkap</span> dengan format <span style={{ color: '#FF7AD0' }}>Given-When-Then</span>. Cukup ketik, klik, dan <span style={{ color: '#C27AFF' }}>langsung jadi</span>!
            </p>
          </div>

          {/* Two Column Layout */}
          <div className="grid lg:grid-cols-2 gap-8">
            
            {/* Left Column - Input Section */}
            <div className="flex flex-col">
              <div className="backdrop-blur-lg rounded-2xl border p-6 shadow-2xl" style={{ backgroundColor: '#09090A', borderColor: 'rgba(255, 255, 255, 0.05)' }}>
                <textarea
                  value={userStory}
                  onChange={(e) => setUserStory(e.target.value)}
                  placeholder="Masukkan user story Anda..."
                  className="w-full bg-transparent text-white placeholder-gray-500 resize-none outline-none min-h-[120px] text-base focus:outline-none"
                />
                
                <div className="flex items-center justify-between mt-6 flex-wrap gap-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <button
                      onClick={() => setShowFormatGuide(!showFormatGuide)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm border"
                      style={{ backgroundColor: '#09090A', borderColor: 'rgba(255, 255, 255, 0.05)' }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      Format Guide
                    </button>
                    
                    <button
                      onClick={() => insertTemplate()}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm border"
                      style={{ backgroundColor: '#09090A', borderColor: 'rgba(255, 255, 255, 0.05)' }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                      Use Format
                    </button>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <button
                        onClick={() => setShowAIDropdown(!showAIDropdown)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition-colors hover:border-white/10"
                        style={{ backgroundColor: '#09090A', borderColor: 'rgba(255, 255, 255, 0.05)' }}
                      >
                        <div className="w-5 h-5 rounded bg-transparent flex items-center justify-center text-[10px] font-bold">
                          {llmInfo.icon}
                        </div>
                        <span className="text-gray-300">{llmInfo.shortName}</span>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Dropdown Menu */}
                      {showAIDropdown && (
                        <div 
                          className="absolute top-full mt-2 right-0 rounded-lg border shadow-xl z-50 min-w-[250px]"
                          style={{ backgroundColor: '#09090A', borderColor: 'rgba(255, 255, 255, 0.05)' }}
                        >
                          {availableModels.length > 1 ? (
                            <div className="py-2">
                              {availableModels.map((model) => (
                                <button
                                  key={model.id}
                                  className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors flex items-start gap-3"
                                  onClick={() => {
                                    // TODO: Implement model switching
                                    toast.success(`Switched to ${model.name}`);
                                    setShowAIDropdown(false);
                                  }}
                                >
                                  <div className="text-lg">{llmInfo.icon}</div>
                                  <div className="flex-1">
                                    <div className="text-sm font-medium text-white">{model.name}</div>
                                    <div className="text-xs text-gray-400 mt-1">{model.description}</div>
                                  </div>
                                  {model.isDefault && (
                                    <div className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#120C18', color: '#C27AFF' }}>
                                      Active
                                    </div>
                                  )}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="px-4 py-3 text-sm text-gray-400">
                              Belum ada model lain yang tersedia
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={handleGenerate}
                      disabled={!userStory.trim()}
                      className={`px-6 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2 border ${
                        userStory.trim()
                          ? 'border-[#2C1A43]'
                          : 'border-white/5'
                      }`}
                      style={{
                        backgroundColor: userStory.trim() ? '#120C18' : '#0D0D0D'
                      }}
                    >
                      <svg 
                        className="w-5 h-5" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                        style={{ color: userStory.trim() ? '#C27AFF' : 'rgba(255, 255, 255, 0.3)' }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Suggested Scenarios */}
            <div className="flex flex-col">
              <div className="mb-6">
                <div className="flex items-center gap-3 flex-wrap">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className="px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-300 border"
                      style={
                        selectedCategory === category
                          ? { backgroundColor: '#160D14', borderColor: '#44273D', color: '#FF7AD0' }
                          : { backgroundColor: '#0D0D0D', borderColor: 'transparent', color: 'rgba(255, 255, 255, 0.5)' }
                      }
                    >
                      {category} {category === 'All' && `(${sampleStories.length})`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sample Stories List */}
              <div className="flex-1 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  {filteredStories.map((story) => (
                    <div
                      key={story.id}
                      onClick={() => handleStoryClick(story)}
                      className="backdrop-blur-lg rounded-xl p-5 border transition-all duration-300 cursor-pointer group"
                      style={{ backgroundColor: '#09090A', borderColor: 'transparent' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#2C1A43';
                        e.currentTarget.querySelector('h3').style.color = '#C27AFF';
                        e.currentTarget.querySelector('.category-chip').style.color = '#FFFFFF';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'transparent';
                        e.currentTarget.querySelector('h3').style.color = 'white';
                        e.currentTarget.querySelector('.category-chip').style.color = '#FFFFFF';
                      }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-base font-semibold transition-colors flex-1" style={{ color: 'white' }}>
                          {story.title}
                        </h3>
                        <div className="category-chip inline-block px-2.5 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-[10px] ml-3 whitespace-nowrap transition-colors" style={{ color: '#FFFFFF' }}>
                          {story.category}
                        </div>
                      </div>
                      <p className="text-sm text-gray-400 leading-relaxed line-clamp-2 mb-3">
                        {story.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 mt-20 bg-[#020203]/90 backdrop-blur-2xl">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
            <p>© 2025 SpecWeave. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-purple-300 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-purple-300 transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Format Guide Modal */}
      <FormatGuide
        isVisible={showFormatGuide}
        onClose={() => setShowFormatGuide(false)}
      />
    </div>
  );
};

export default Landing;
