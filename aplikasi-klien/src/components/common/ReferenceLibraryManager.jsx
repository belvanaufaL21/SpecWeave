import { useState, useEffect } from 'react';
import { referenceService } from '../../services/referenceService';

const ReferenceLibraryManager = ({ isOpen, onClose, onSelectReference, currentReference = '' }) => {
  const [references, setReferences] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [serverError, setServerError] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [newReference, setNewReference] = useState({
    title: '',
    given: [''],
    when: [''],
    then: ['']
  });

  // Offline storage key
  const OFFLINE_STORAGE_KEY = 'specweave_offline_references';

  // Helper function to convert structured data to Gherkin text
  const structuredToGherkin = (structured) => {
    let gherkin = '';
    
    if (structured.given && structured.given.length > 0) {
      structured.given.forEach(step => {
        if (step.trim()) gherkin += `Given ${step.trim()}\n`;
      });
    }
    
    if (structured.when && structured.when.length > 0) {
      structured.when.forEach(step => {
        if (step.trim()) gherkin += `When ${step.trim()}\n`;
      });
    }
    
    if (structured.then && structured.then.length > 0) {
      structured.then.forEach(step => {
        if (step.trim()) gherkin += `Then ${step.trim()}\n`;
      });
    }
    
    return gherkin.trim();
  };

  // Helper function to parse Gherkin text to structured data
  const gherkinToStructured = (gherkinText) => {
    const lines = gherkinText.split('\n').map(line => line.trim()).filter(line => line);
    const structured = { given: [], when: [], then: [] };
    
    lines.forEach(line => {
      if (line.toLowerCase().startsWith('given ')) {
        structured.given.push(line.substring(6).trim());
      } else if (line.toLowerCase().startsWith('when ')) {
        structured.when.push(line.substring(5).trim());
      } else if (line.toLowerCase().startsWith('then ')) {
        structured.then.push(line.substring(5).trim());
      }
    });
    
    // Ensure at least one empty field for each type
    if (structured.given.length === 0) structured.given.push('');
    if (structured.when.length === 0) structured.when.push('');
    if (structured.then.length === 0) structured.then.push('');
    
    return structured;
  };

  // Add step to a specific type (given/when/then)
  const addStep = (type) => {
    setNewReference(prev => ({
      ...prev,
      [type]: [...prev[type], '']
    }));
  };

  // Remove step from a specific type
  const removeStep = (type, index) => {
    setNewReference(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  // Update step content
  const updateStep = (type, index, value) => {
    setNewReference(prev => ({
      ...prev,
      [type]: prev[type].map((step, i) => i === index ? value : step)
    }));
  };

  useEffect(() => {
    if (isOpen) {
      loadReferences();
    }
  }, [isOpen]);

  // Initialize form with current reference if provided
  useEffect(() => {
    if (currentReference && currentReference.trim()) {
      const structured = gherkinToStructured(currentReference);
      setNewReference(prev => ({
        ...prev,
        ...structured
      }));
    }
  }, [currentReference]);

  // Load references from server or offline storage
  const loadReferences = async () => {
    setIsLoading(true);
    setServerError(false);
    
    try {
      // Try server first
      const result = await referenceService.getReferences();
      
      if (result.success) {
        setReferences(result.data || []);
        setServerError(false);
        setOfflineMode(false);
        // Save to offline storage as backup
        localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(result.data || []));
      } else {
        throw new Error('Server error');
      }
    } catch (error) {
      console.warn('Server unavailable, switching to offline mode:', error.message);
      
      // Fallback to offline storage
      try {
        const offlineData = localStorage.getItem(OFFLINE_STORAGE_KEY);
        const offlineReferences = offlineData ? JSON.parse(offlineData) : [];
        setReferences(offlineReferences);
        setOfflineMode(true);
        setServerError(true);
      } catch (offlineError) {
        console.error('Failed to load offline data:', offlineError);
        setReferences([]);
        setOfflineMode(true);
        setServerError(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Save reference (online or offline)
  const saveReference = async () => {
    if (!newReference.title.trim()) {
      alert('Judul harus diisi');
      return;
    }

    // Check if at least one step is filled
    const hasSteps = [...newReference.given, ...newReference.when, ...newReference.then]
      .some(step => step.trim());
    
    if (!hasSteps) {
      alert('Minimal satu langkah Gherkin harus diisi');
      return;
    }

    // Convert structured data to Gherkin text
    const gherkinContent = structuredToGherkin(newReference);

    const referenceData = {
      id: Date.now().toString(), // Simple ID for offline mode
      title: newReference.title,
      gherkinContent: gherkinContent,
      category: 'general',
      tags: [],
      usageCount: 0,
      averageScore: null,
      isPublic: false,
      createdAt: new Date().toISOString()
    };

    if (offlineMode) {
      // Offline mode - save to localStorage
      try {
        const updatedReferences = [referenceData, ...references];
        setReferences(updatedReferences);
        localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(updatedReferences));
        
        setNewReference({ title: '', given: [''], when: [''], then: [''] });
        setShowAddForm(false);
        
        alert('Referensi disimpan dalam mode offline. Data akan disinkronkan saat server tersedia.');
      } catch (error) {
        console.error('Failed to save offline:', error);
        alert('Gagal menyimpan referensi offline');
      }
    } else {
      // Online mode - try server
      try {
        const result = await referenceService.createReference({
          title: newReference.title,
          gherkinContent: gherkinContent,
          category: 'general',
          tags: [],
          isPublic: false
        });
        
        if (result.success) {
          setReferences([result.data, ...references]);
          setNewReference({ title: '', given: [''], when: [''], then: [''] });
          setShowAddForm(false);
          
          // Update offline backup
          const updatedReferences = [result.data, ...references];
          localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(updatedReferences));
        } else {
          alert('Gagal menyimpan referensi: ' + (result.error || 'Server tidak tersedia'));
        }
      } catch (error) {
        console.error('Failed to save reference:', error);
        alert('Server tidak tersedia. Referensi disimpan dalam mode offline.');
        
        // Fallback to offline save
        const updatedReferences = [referenceData, ...references];
        setReferences(updatedReferences);
        localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(updatedReferences));
        
        setNewReference({ title: '', given: [''], when: [''], then: [''] });
        setShowAddForm(false);
        setOfflineMode(true);
        setServerError(true);
      }
    }
  };

  // Delete reference (online or offline)
  const deleteReference = async (referenceId) => {
    if (!confirm('Apakah Anda yakin ingin menghapus referensi ini?')) {
      return;
    }

    if (offlineMode) {
      // Offline mode - remove from localStorage
      try {
        const updatedReferences = references.filter(ref => ref.id !== referenceId);
        setReferences(updatedReferences);
        localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(updatedReferences));
      } catch (error) {
        console.error('Failed to delete offline:', error);
        alert('Gagal menghapus referensi offline');
      }
    } else {
      // Online mode - try server
      try {
        const result = await referenceService.deleteReference(referenceId);
        
        if (result.success) {
          const updatedReferences = references.filter(ref => ref.id !== referenceId);
          setReferences(updatedReferences);
          
          // Update offline backup
          localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(updatedReferences));
        } else {
          alert('Gagal menghapus referensi: ' + (result.error || 'Server tidak tersedia'));
        }
      } catch (error) {
        console.error('Failed to delete reference:', error);
        
        // Fallback to offline delete
        const updatedReferences = references.filter(ref => ref.id !== referenceId);
        setReferences(updatedReferences);
        localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(updatedReferences));
        
        setOfflineMode(true);
        setServerError(true);
        alert('Server tidak tersedia. Referensi dihapus dalam mode offline.');
      }
    }
  };

  const filteredReferences = references.filter(ref => {
    const matchesSearch = !searchTerm || 
      ref.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ref.gherkinContent?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const handleSelectReference = async (reference) => {
    // Track usage for analytics and few-shot prompting optimization
    try {
      await referenceService.trackUsage(reference.id);
      console.log(`📊 Tracked usage for reference: ${reference.title}`);
    } catch (error) {
      console.warn('Failed to track reference usage:', error);
    }
    
    onSelectReference(reference);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#16161e] border border-white/10 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold text-white">Library Referensi Scenario</h2>
            <p className="text-gray-400 text-sm mt-1">
              Kelola dan pilih scenario referensi untuk testing METEOR
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-sm font-medium rounded-lg transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Tambah Referensi
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex h-[70vh]">
          {/* Sidebar - Simplified */}
          <div className="w-80 p-6 border-r border-white/10 bg-white/5">
            <div className="space-y-6">
              {/* Server Status */}
              {serverError && (
                <div className={`p-3 border rounded-lg ${offlineMode ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <svg className={`w-4 h-4 ${offlineMode ? 'text-amber-400' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className={`text-sm font-medium ${offlineMode ? 'text-amber-400' : 'text-red-400'}`}>
                      {offlineMode ? 'Mode Offline' : 'Server Offline'}
                    </span>
                  </div>
                  <p className={`text-xs ${offlineMode ? 'text-amber-300' : 'text-red-300'}`}>
                    {offlineMode 
                      ? 'Menggunakan penyimpanan lokal. Data akan disinkronkan saat server tersedia.'
                      : 'Server tidak tersedia. Pastikan server berjalan di port 5002.'
                    }
                  </p>
                </div>
              )}

              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">Cari Referensi</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cari berdasarkan judul atau konten..."
                    className="w-full px-4 py-2 pl-10 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                  />
                  <svg className="w-4 h-4 text-gray-500 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Simple Stats */}
              <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <h4 className="text-sm font-semibold text-white mb-2">Statistik</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Referensi:</span>
                    <span className="text-white font-medium">{references.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Hasil Filter:</span>
                    <span className="text-white font-medium">{filteredReferences.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {showAddForm ? (
              /* Add Reference Form - Beautiful Table Layout */
              <div className="p-6 overflow-y-auto">
                <h3 className="text-lg font-semibold text-white mb-6">Tambah Referensi Baru</h3>
                <div className="space-y-6">
                  {/* Title Input */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Judul Scenario</label>
                    <input
                      type="text"
                      value={newReference.title}
                      onChange={(e) => setNewReference({...newReference, title: e.target.value})}
                      placeholder="Contoh: Login dengan Email dan Password"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>

                  {/* Gherkin Table */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-4">Scenario Gherkin</label>
                    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                      <div className="grid grid-cols-3 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-b border-white/10">
                        <div className="p-4 border-r border-white/10">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              Given
                            </h4>
                            <button
                              onClick={() => addStep('given')}
                              className="p-1 text-green-400 hover:text-green-300 transition-colors"
                              title="Tambah langkah Given"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">Kondisi awal</p>
                        </div>
                        <div className="p-4 border-r border-white/10">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                              When
                            </h4>
                            <button
                              onClick={() => addStep('when')}
                              className="p-1 text-blue-400 hover:text-blue-300 transition-colors"
                              title="Tambah langkah When"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">Aksi yang dilakukan</p>
                        </div>
                        <div className="p-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                              Then
                            </h4>
                            <button
                              onClick={() => addStep('then')}
                              className="p-1 text-orange-400 hover:text-orange-300 transition-colors"
                              title="Tambah langkah Then"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">Hasil yang diharapkan</p>
                        </div>
                      </div>

                      {/* Table Content */}
                      <div className="grid grid-cols-3 min-h-[300px]">
                        {/* Given Column */}
                        <div className="p-4 border-r border-white/10 space-y-3">
                          {newReference.given.map((step, index) => (
                            <div key={index} className="group relative">
                              <textarea
                                value={step}
                                onChange={(e) => updateStep('given', index, e.target.value)}
                                placeholder="pengguna berada di halaman login"
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 resize-none text-sm"
                                rows={2}
                              />
                              {newReference.given.length > 1 && (
                                <button
                                  onClick={() => removeStep('given', index)}
                                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Hapus langkah"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* When Column */}
                        <div className="p-4 border-r border-white/10 space-y-3">
                          {newReference.when.map((step, index) => (
                            <div key={index} className="group relative">
                              <textarea
                                value={step}
                                onChange={(e) => updateStep('when', index, e.target.value)}
                                placeholder="pengguna mengklik tombol login"
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 resize-none text-sm"
                                rows={2}
                              />
                              {newReference.when.length > 1 && (
                                <button
                                  onClick={() => removeStep('when', index)}
                                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Hapus langkah"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Then Column */}
                        <div className="p-4 space-y-3">
                          {newReference.then.map((step, index) => (
                            <div key={index} className="group relative">
                              <textarea
                                value={step}
                                onChange={(e) => updateStep('then', index, e.target.value)}
                                placeholder="sistem menampilkan dashboard"
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 resize-none text-sm"
                                rows={2}
                              />
                              {newReference.then.length > 1 && (
                                <button
                                  onClick={() => removeStep('then', index)}
                                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Hapus langkah"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Preview */}
                    <div className="mt-4 p-4 bg-black/20 border border-white/10 rounded-lg">
                      <h5 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Preview Gherkin
                      </h5>
                      <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                        {structuredToGherkin(newReference) || 'Belum ada langkah yang diisi...'}
                      </pre>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={saveReference}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all font-semibold shadow-lg"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Simpan Referensi
                    </button>
                    <button
                      onClick={() => {
                        setShowAddForm(false);
                        setNewReference({ title: '', given: [''], when: [''], then: [''] });
                      }}
                      className="px-4 py-3 border border-white/20 text-gray-300 rounded-lg hover:bg-white/5 transition-all"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Reference List */
              <div className="flex-1 overflow-y-auto p-6">
                {isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                  </div>
                ) : filteredReferences.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="text-lg font-semibold text-white mb-2">Tidak ada referensi ditemukan</h3>
                    <p className="text-gray-400 mb-4">
                      {searchTerm 
                        ? 'Coba ubah kata kunci pencarian Anda'
                        : 'Mulai dengan menambahkan referensi pertama Anda'
                      }
                    </p>
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all"
                    >
                      Tambah Referensi
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {filteredReferences.map((reference) => (
                      <div key={reference.id} className="p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-white mb-1">{reference.title}</h4>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>Digunakan: {reference.usageCount || 0}x</span>
                              {reference.averageScore && (
                                <span>Skor: {(reference.averageScore * 100).toFixed(1)}%</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <button
                              onClick={() => handleSelectReference(reference)}
                              className="px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all"
                            >
                              Pilih
                            </button>
                            <button
                              onClick={() => deleteReference(reference.id)}
                              className="p-1 text-red-400 hover:text-red-300 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Enhanced Preview with Table Format */}
                        <div className="bg-black/20 border border-white/5 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="text-sm font-medium text-white flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Scenario Preview
                            </h5>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>Digunakan: {reference.usageCount || 0}x</span>
                              {reference.averageScore && (
                                <span>Skor: {(reference.averageScore * 100).toFixed(1)}%</span>
                              )}
                            </div>
                          </div>
                          
                          {/* Parse and display structured format */}
                          {(() => {
                            const structured = gherkinToStructured(reference.gherkinContent);
                            const hasStructuredData = structured.given.some(s => s) || structured.when.some(s => s) || structured.then.some(s => s);
                            
                            if (hasStructuredData) {
                              return (
                                <div className="grid grid-cols-3 gap-4 text-xs">
                                  {/* Given */}
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                      <span className="text-green-400 font-medium">Given</span>
                                    </div>
                                    <div className="space-y-1">
                                      {structured.given.filter(s => s.trim()).map((step, i) => (
                                        <div key={i} className="text-gray-300 bg-white/5 rounded px-2 py-1">
                                          {step}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  
                                  {/* When */}
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                      <span className="text-blue-400 font-medium">When</span>
                                    </div>
                                    <div className="space-y-1">
                                      {structured.when.filter(s => s.trim()).map((step, i) => (
                                        <div key={i} className="text-gray-300 bg-white/5 rounded px-2 py-1">
                                          {step}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  
                                  {/* Then */}
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                      <span className="text-orange-400 font-medium">Then</span>
                                    </div>
                                    <div className="space-y-1">
                                      {structured.then.filter(s => s.trim()).map((step, i) => (
                                        <div key={i} className="text-gray-300 bg-white/5 rounded px-2 py-1">
                                          {step}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              );
                            } else {
                              return (
                                <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                                  {reference.gherkinContent.length > 200 
                                    ? reference.gherkinContent.substring(0, 200) + '...'
                                    : reference.gherkinContent
                                  }
                                </pre>
                              );
                            }
                          })()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferenceLibraryManager;