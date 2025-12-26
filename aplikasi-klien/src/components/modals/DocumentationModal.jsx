import { useState, useEffect } from 'react';
import manualGuideService from '../../services/manualGuideService';

const DocumentationModal = ({ isOpen, onClose }) => {
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [guideContent, setGuideContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [availableGuides, setAvailableGuides] = useState([]);
  const [loadingGuides, setLoadingGuides] = useState(true);

  // Load available guides saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      loadAvailableGuides();
    }
  }, [isOpen]);

  const loadAvailableGuides = async () => {
    setLoadingGuides(true);
    try {
      const guides = await manualGuideService.getAvailableGuides();
      setAvailableGuides(guides);
    } catch (error) {
      console.error('Error loading guides:', error);
      // Fallback ke default guides
      setAvailableGuides(manualGuideService.getDefaultGuides());
    } finally {
      setLoadingGuides(false);
    }
  };

  const categories = [...new Set(availableGuides.map(guide => guide.category))];

  const filteredGuides = manualGuideService.searchGuides(availableGuides, searchTerm);

  const loadGuideContent = async (guide) => {
    setLoading(true);
    setSelectedGuide(guide);
    
    try {
      const content = await manualGuideService.getCombinedGuideContent(guide.files, guide.title);
      setGuideContent(content);
    } catch (error) {
      console.error('Error loading guide content:', error);
      setGuideContent(`# Error\n\nTidak dapat memuat konten untuk ${guide.title}.\n\nError: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedGuide(null);
    setGuideContent('');
    setSearchTerm('');
    setAvailableGuides([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-[#16161e] border border-white/10 rounded-xl w-full max-w-6xl h-[85vh] flex flex-col shadow-2xl transform transition-all duration-200 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold text-white">Manual Guide & Documentation</h2>
            <p className="text-sm text-gray-400 mt-1">Panduan lengkap penggunaan aplikasi</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - Guide List */}
          <div className="w-80 border-r border-white/10 flex flex-col bg-[#1a1a24]/50">
            {/* Search */}
            <div className="p-4 border-b border-white/10">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari panduan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 pl-10 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                />
                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Categories & Guides */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingGuides ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
                </div>
              ) : (
                categories.map(category => {
                  const categoryGuides = filteredGuides.filter(guide => guide.category === category);
                  if (categoryGuides.length === 0) return null;

                  return (
                    <div key={category}>
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        {category}
                      </h3>
                      <div className="space-y-1">
                        {categoryGuides.map(guide => (
                          <button
                            key={guide.id}
                            onClick={() => loadGuideContent(guide)}
                            className={`w-full text-left p-3 rounded-lg transition-colors ${
                              selectedGuide?.id === guide.id
                                ? 'bg-purple-600/20 border border-purple-500/30'
                                : 'hover:bg-white/5 border border-transparent'
                            }`}
                          >
                            <div className="font-medium text-white text-sm mb-1">
                              {guide.title}
                            </div>
                            <div className="text-xs text-gray-400 line-clamp-2">
                              {guide.description}
                            </div>
                            <div className="text-xs text-purple-400 mt-1">
                              {guide.files?.length || 0} file(s)
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex flex-col">
            {selectedGuide ? (
              <>
                {/* Content Header */}
                <div className="p-6 border-b border-white/10">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white">{selectedGuide.title}</h3>
                      <p className="text-sm text-gray-400 mt-1">{selectedGuide.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="px-2 py-1 bg-purple-600/20 text-purple-300 text-xs rounded-full">
                          {selectedGuide.category}
                        </span>
                        <span className="text-xs text-gray-500">
                          {selectedGuide.files.length} dokumentasi
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto p-6">
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                    </div>
                  ) : (
                    <div className="prose prose-invert max-w-none">
                      <div className="markdown-content text-sm text-gray-300 leading-relaxed">
                        {guideContent.split('\n').map((line, index) => {
                          // Simple markdown parsing
                          if (line.startsWith('# ')) {
                            return <h1 key={index} className="text-2xl font-bold text-white mt-6 mb-4">{line.substring(2)}</h1>;
                          } else if (line.startsWith('## ')) {
                            return <h2 key={index} className="text-xl font-semibold text-white mt-5 mb-3">{line.substring(3)}</h2>;
                          } else if (line.startsWith('### ')) {
                            return <h3 key={index} className="text-lg font-medium text-white mt-4 mb-2">{line.substring(4)}</h3>;
                          } else if (line.startsWith('- ')) {
                            return <li key={index} className="ml-4 mb-1 text-gray-300">{line.substring(2)}</li>;
                          } else if (line.startsWith('---')) {
                            return <hr key={index} className="border-white/10 my-6" />;
                          } else if (line.trim() === '') {
                            return <br key={index} />;
                          } else {
                            return <p key={index} className="mb-2 text-gray-300">{line}</p>;
                          }
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <h3 className="text-lg font-medium text-white mb-2">Pilih Panduan</h3>
                  <p className="text-gray-400 text-sm">
                    Pilih salah satu panduan dari daftar di sebelah kiri untuk melihat dokumentasinya
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentationModal;