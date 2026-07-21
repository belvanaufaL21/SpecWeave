import { useState, useEffect } from 'react';
import { referenceService } from '../../services/reference/ReferenceService';
import { refreshReferencePatterns } from '../../services/EnhancedSpecWeaveService';
import AutoExpandingTextarea from './AutoExpandingTextarea';
import ReferenceLibraryEmptyState from './ReferenceLibraryEmptyState';
import DeleteConfirmationModal from '../modals/DeleteConfirmationModal';
import Logo from './Logo';

/**
 * Component Reference Library untuk few-shot prompting
 * Menampilkan dan mengelola contoh-contoh referensi scenario Gherkin
 */
const ReferenceLibraryWithAutoSettings = ({ isOpen, onClose }) => {
  const [references, setReferences] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [serverError, setServerError] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [expandedRefs, setExpandedRefs] = useState({});
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isTitleFocused, setIsTitleFocused] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [referenceToDelete, setReferenceToDelete] = useState(null);

  const [newReference, setNewReference] = useState({
    title: '',
    userStory: '', // Add user story field for few-shot prompting
    scenarios: [
      {
        given: [''],
        when: [''],
        then: ['']
      }
    ]
  });

  const [errors, setErrors] = useState({
    title: '',
    userStory: '',
    scenarios: []
  });

  // Offline storage key
  const OFFLINE_STORAGE_KEY = 'specweave_offline_references';

  // Helper functions (same as original ReferenceLibraryManager)
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

  const gherkinToStructured = (gherkinText) => {
    const lines = gherkinText.split('\n').map(line => line.trim()).filter(line => line);
    const scenarios = [];
    let currentScenario = { given: [], when: [], then: [] };
    
    lines.forEach(line => {
      const lowerLine = line.toLowerCase();
      
      if (lowerLine.startsWith('given ')) {
        // If we already have a complete scenario (has given, when, then), start a new one
        if (currentScenario.given.length > 0 && currentScenario.when.length > 0 && currentScenario.then.length > 0) {
          scenarios.push(currentScenario);
          currentScenario = { given: [], when: [], then: [] };
        }
        currentScenario.given.push(line.substring(6).trim());
      } else if (lowerLine.startsWith('when ')) {
        currentScenario.when.push(line.substring(5).trim());
      } else if (lowerLine.startsWith('then ')) {
        currentScenario.then.push(line.substring(5).trim());
      }
    });
    
    // Add the last scenario if it has content
    if (currentScenario.given.length > 0 || currentScenario.when.length > 0 || currentScenario.then.length > 0) {
      scenarios.push(currentScenario);
    }
    
    // If no scenarios found, return one empty scenario
    if (scenarios.length === 0) {
      scenarios.push({ given: [''], when: [''], then: [''] });
    }
    
    return scenarios;
  };

  const addStep = (scenarioIndex, type) => {
    setNewReference(prev => {
      const newScenarios = [...prev.scenarios];
      newScenarios[scenarioIndex] = {
        ...newScenarios[scenarioIndex],
        [type]: [...newScenarios[scenarioIndex][type], '']
      };
      return { ...prev, scenarios: newScenarios };
    });
  };

  const removeStep = (scenarioIndex, type, index) => {
    setNewReference(prev => {
      const newScenarios = [...prev.scenarios];
      newScenarios[scenarioIndex] = {
        ...newScenarios[scenarioIndex],
        [type]: newScenarios[scenarioIndex][type].filter((_, i) => i !== index)
      };
      return { ...prev, scenarios: newScenarios };
    });
  };

  const updateStep = (scenarioIndex, type, index, value) => {
    setNewReference(prev => {
      const newScenarios = [...prev.scenarios];
      newScenarios[scenarioIndex] = {
        ...newScenarios[scenarioIndex],
        [type]: newScenarios[scenarioIndex][type].map((step, i) => i === index ? value : step)
      };
      return { ...prev, scenarios: newScenarios };
    });
  };

  const addScenario = () => {
    setNewReference(prev => ({
      ...prev,
      scenarios: [...prev.scenarios, { given: [''], when: [''], then: [''] }]
    }));
  };

  const removeScenario = (scenarioIndex) => {
    if (newReference.scenarios.length > 1) {
      setNewReference(prev => ({
        ...prev,
        scenarios: prev.scenarios.filter((_, i) => i !== scenarioIndex)
      }));
    }
  };

  const toggleReference = (refId) => {
    setExpandedRefs(prev => ({
      ...prev,
      [refId]: !prev[refId]
    }));
  };

  useEffect(() => {
    if (isOpen) {
      loadReferences();
    }
  }, [isOpen]);

  // Load references
  const loadReferences = async () => {
    setIsLoading(true);
    setServerError(false);
    
    try {
      
      const result = await referenceService.getReferences();
      
      if (result.success) {
        
        setReferences(result.data || []);
        setServerError(false);
        setOfflineMode(false);
        localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(result.data || []));
      } else if (result.offlineMode) {
        throw new Error('Server returned offline mode');
      } else {
        throw new Error(result.error || 'Server error');
      }
    } catch (error) {
      console.warn('⚠️ [REFERENCE-LIBRARY] Server unavailable, switching to offline mode:', error.message);
      
      try {
        const offlineData = localStorage.getItem(OFFLINE_STORAGE_KEY);
        const offlineReferences = offlineData ? JSON.parse(offlineData) : [];
        setReferences(offlineReferences);
        setOfflineMode(true);
        setServerError(true);
      } catch (offlineError) {
        console.error('❌ [REFERENCE-LIBRARY] Failed to load offline data:', offlineError);
        setReferences([]);
        setOfflineMode(true);
        setServerError(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Save reference
  const saveReference = async () => {
    // Reset errors
    setErrors({ title: '', userStory: '', scenarios: [] });
    
    // Validate title
    if (!newReference.title.trim()) {
      setErrors(prev => ({ ...prev, title: 'Judul tidak boleh kosong' }));
      return;
    }

    // Validate user story (WAJIB diisi)
    if (!newReference.userStory.trim()) {
      setErrors(prev => ({ ...prev, userStory: 'User story tidak boleh kosong' }));
      return;
    }

    // Validate scenarios
    let hasError = false;
    const scenarioErrors = newReference.scenarios.map((scenario, index) => {
      const errors = { given: '', when: '', then: '' };
      
      const hasGiven = scenario.given.some(step => step.trim());
      const hasWhen = scenario.when.some(step => step.trim());
      const hasThen = scenario.then.some(step => step.trim());
      
      if (!hasGiven) {
        errors.given = 'Tidak boleh kosong';
        hasError = true;
      }
      if (!hasWhen) {
        errors.when = 'Tidak boleh kosong';
        hasError = true;
      }
      if (!hasThen) {
        errors.then = 'Tidak boleh kosong';
        hasError = true;
      }
      
      return errors;
    });
    
    if (hasError) {
      setErrors(prev => ({ ...prev, scenarios: scenarioErrors }));
      return;
    }

    // Convert all scenarios to gherkin
    let allGherkinContent = '';
    newReference.scenarios.forEach((scenario, index) => {
      if (index > 0) allGherkinContent += '\n\n';
      allGherkinContent += structuredToGherkin(scenario);
    });

    const referenceData = {
      id: Date.now().toString(),
      title: newReference.title,
      userStory: newReference.userStory || null, // Add user story for few-shot prompting
      gherkinContent: allGherkinContent,
      category: 'general',
      tags: [],
      usageCount: 0,
      averageScore: null,
      isPublic: false,
      createdAt: new Date().toISOString()
    };

    if (offlineMode) {
      try {
        const updatedReferences = [referenceData, ...references];
        setReferences(updatedReferences);
        localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(updatedReferences));
        
        setNewReference({ title: '', userStory: '', scenarios: [{ given: [''], when: [''], then: [''] }] });
        setShowAddForm(false);
        
        // Refresh auto reference patterns after adding new reference
        await handleRefreshPatterns();
        
        alert('Referensi disimpan dalam mode offline. Data akan disinkronkan saat server tersedia.');
      } catch (error) {
        console.error('Failed to save offline:', error);
        alert('Gagal menyimpan referensi offline');
      }
    } else {
      try {
        const result = await referenceService.createReference({
          title: newReference.title,
          userStory: newReference.userStory || null, // Add user story for few-shot prompting
          gherkinContent: allGherkinContent,
          category: 'general',
          tags: [],
          isPublic: false
        });
        
        if (result.success) {
          setReferences([result.data, ...references]);
          setNewReference({ title: '', userStory: '', scenarios: [{ given: [''], when: [''], then: [''] }] });
          setShowAddForm(false);
          
          const updatedReferences = [result.data, ...references];
          localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(updatedReferences));
          
          // Refresh auto reference patterns after adding new reference
          await handleRefreshPatterns();
        } else {
          alert('Gagal menyimpan referensi: ' + (result.error || 'Server tidak tersedia'));
        }
      } catch (error) {
        console.error('Failed to save reference:', error);
        alert('Server tidak tersedia. Referensi disimpan dalam mode offline.');
        
        const updatedReferences = [referenceData, ...references];
        setReferences(updatedReferences);
        localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(updatedReferences));
        
        setNewReference({ title: '', userStory: '', scenarios: [{ given: [''], when: [''], then: [''] }] });
        setShowAddForm(false);
        setOfflineMode(true);
        setServerError(true);
        
        await handleRefreshPatterns();
      }
    }
  };

  // Delete reference
  const handleDeleteClick = (reference) => {
    setReferenceToDelete(reference);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteReference = async () => {
    if (!referenceToDelete) return;

    const referenceId = referenceToDelete.id;

    if (offlineMode) {
      try {
        const updatedReferences = references.filter(ref => ref.id !== referenceId);
        setReferences(updatedReferences);
        localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(updatedReferences));
        await handleRefreshPatterns();
      } catch (error) {
        console.error('Failed to delete offline:', error);
        alert('Gagal menghapus referensi offline');
      }
    } else {
      try {
        const result = await referenceService.deleteReference(referenceId);
        
        if (result.success) {
          const updatedReferences = references.filter(ref => ref.id !== referenceId);
          setReferences(updatedReferences);
          localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(updatedReferences));
          await handleRefreshPatterns();
        } else {
          alert('Gagal menghapus referensi: ' + (result.error || 'Server tidak tersedia'));
        }
      } catch (error) {
        console.error('Failed to delete reference:', error);
        
        const updatedReferences = references.filter(ref => ref.id !== referenceId);
        setReferences(updatedReferences);
        localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(updatedReferences));
        
        setOfflineMode(true);
        setServerError(true);
        await handleRefreshPatterns();
        alert('Server tidak tersedia. Referensi dihapus dalam mode offline.');
      }
    }
  };

  // Auto reference handlers - simplified for few-shot prompting
  const handleRefreshPatterns = async () => {
    try {
      const result = await refreshReferencePatterns();
      if (result.success) {
        console.log('Patterns refreshed successfully');
      }
    } catch (err) {
      console.error('Failed to refresh patterns:', err);
    }
  };

  const filteredReferences = references.filter(ref => {
    const matchesSearch = !searchTerm || 
      ref.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ref.gherkinContent?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  if (!isOpen) return null;

  return (
    <>
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#09090A] border border-white/5 rounded-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div>
            <h2 className="text-xl font-bold text-white">Reference Library</h2>
            <p className="text-gray-400 text-sm mt-1">
              Kelola contoh referensi untuk few-shot prompting
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Main Content - Single View */}
        <div className="flex h-[70vh]">
          {/* Sidebar */}
          <div className="w-80 p-6 border-r border-white/5 bg-[#09090A]">
                  {/* Server Status */}
                  {serverError && (
                    <div className={`p-3 border rounded-lg mb-6 ${offlineMode ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
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
                  <div className="mb-6">
                    <div className="relative">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setIsSearchFocused(false)}
                        placeholder={isSearchFocused ? "" : "Cari referensi"}
                        className="w-full px-4 py-3 pl-10 bg-[#0D0D0D] border border-white/5 rounded-lg text-white/50 placeholder-white/50 focus:outline-none focus:border-white/5 focus:bg-[#0D0D0D]"
                      />
                      <svg className="w-4 h-4 text-white/50 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>

                  {/* Add Reference Button */}
                  {!showAddForm && (
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-transparent border border-transparent text-white text-sm font-medium rounded-lg hover:bg-[#0D0D0D] hover:border-white/5 transition-all mb-6"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Tambah Referensi
                    </button>
                  )}
              </div>

              {/* Main Content */}
              <div className="flex-1 flex flex-col">
                {showAddForm ? (
                  /* Add Reference Form */
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 p-6 overflow-y-auto">
                    <h3 className="text-lg font-semibold text-white mb-6">Tambah Referensi Baru</h3>
                    <div className="space-y-6">
                      {/* Title Input */}
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">Judul Scenario</label>
                        <input
                          type="text"
                          value={newReference.title}
                          onChange={(e) => {
                            setNewReference({...newReference, title: e.target.value});
                            if (errors.title) setErrors(prev => ({ ...prev, title: '' }));
                          }}
                          onFocus={() => setIsTitleFocused(true)}
                          onBlur={() => setIsTitleFocused(false)}
                          placeholder={isTitleFocused ? "" : "Contoh: Login dengan Email dan Password"}
                          className={`w-full px-4 py-3 bg-[#0D0D0D] border rounded-lg text-white/50 placeholder-white/50 focus:outline-none focus:bg-[#0D0D0D] ${
                            errors.title ? 'border-red-500' : 'border-white/5 focus:border-white/5'
                          }`}
                        />
                        {errors.title && (
                          <p className="text-red-400 text-xs mt-1">{errors.title}</p>
                        )}
                      </div>

                      {/* User Story Input */}
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          User Story (Input)
                        </label>
                        <AutoExpandingTextarea
                          value={newReference.userStory}
                          onChange={(e) => {
                            setNewReference({...newReference, userStory: e.target.value});
                            if (errors.userStory) setErrors(prev => ({ ...prev, userStory: '' }));
                          }}
                          placeholder="Sebagai user, saya ingin login menggunakan email dan password, agar saya dapat mengakses akun saya dengan aman"
                          className={`w-full px-4 py-3 bg-[#0D0D0D] border rounded-lg text-white/50 placeholder-white/50 focus:outline-none focus:bg-[#0D0D0D] resize-none ${
                            errors.userStory ? 'border-red-500' : 'border-white/5 focus:border-white/5'
                          }`}
                          minRows={2}
                          maxRows={6}
                        />
                        {errors.userStory && (
                          <p className="text-red-400 text-xs mt-1">{errors.userStory}</p>
                        )}
                      </div>

                      {/* Gherkin Table */}
                      <div>
                        <label className="block text-sm font-medium text-white mb-3">
                          Gherkin Scenarios (Output)
                          <span className="ml-2 text-xs text-gray-500">(Format: Given-When-Then)</span>
                        </label>
                        {newReference.scenarios.map((scenario, scenarioIndex) => (
                          <div key={scenarioIndex} className="mb-6">
                            {/* Delete Button - Only show for multiple scenarios */}
                            {newReference.scenarios.length > 1 && (
                              <div className="flex justify-end mb-2">
                                <button
                                  onClick={() => removeScenario(scenarioIndex)}
                                  className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                                  title="Hapus scenario"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            )}
                            
                            <div className="bg-[#09090A] border border-white/5 rounded-xl overflow-hidden">
                          <div className="grid grid-cols-3 bg-[#0D0D0D] border-b border-white/5">
                            <div className="p-4 border-r border-white/5">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-semibold text-white">Given</h4>
                                {errors.scenarios[scenarioIndex]?.given && (
                                  <p className="text-red-400 text-xs">- {errors.scenarios[scenarioIndex].given}</p>
                                )}
                              </div>
                            </div>
                            <div className="p-4 border-r border-white/5">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-semibold text-white">When</h4>
                                {errors.scenarios[scenarioIndex]?.when && (
                                  <p className="text-red-400 text-xs">- {errors.scenarios[scenarioIndex].when}</p>
                                )}
                              </div>
                            </div>
                            <div className="p-4">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-semibold text-white">Then</h4>
                                {errors.scenarios[scenarioIndex]?.then && (
                                  <p className="text-red-400 text-xs">- {errors.scenarios[scenarioIndex].then}</p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Table Content */}
                          <div className="grid grid-cols-3">
                            {/* Given Column */}
                            <div className="p-4 border-r border-white/5 space-y-3">
                              {scenario.given.map((step, index) => (
                                <div key={index} className="group relative">
                                  <AutoExpandingTextarea
                                    value={step}
                                    onChange={(e) => {
                                      updateStep(scenarioIndex, 'given', index, e.target.value);
                                      if (errors.scenarios[scenarioIndex]?.given) {
                                        const newErrors = [...errors.scenarios];
                                        newErrors[scenarioIndex] = { ...newErrors[scenarioIndex], given: '' };
                                        setErrors(prev => ({ ...prev, scenarios: newErrors }));
                                      }
                                    }}
                                    placeholder="Kondisi awal..."
                                    className="w-full px-3 py-2 bg-transparent border-none text-white placeholder-gray-500 focus:outline-none text-sm resize-none"
                                    minRows={1}
                                    maxRows={8}
                                  />
                                  {scenario.given.length > 1 && (
                                    <button
                                      onClick={() => removeStep(scenarioIndex, 'given', index)}
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
                            <div className="p-4 border-r border-white/5 space-y-3">
                              {scenario.when.map((step, index) => (
                                <div key={index} className="group relative">
                                  <AutoExpandingTextarea
                                    value={step}
                                    onChange={(e) => {
                                      updateStep(scenarioIndex, 'when', index, e.target.value);
                                      if (errors.scenarios[scenarioIndex]?.when) {
                                        const newErrors = [...errors.scenarios];
                                        newErrors[scenarioIndex] = { ...newErrors[scenarioIndex], when: '' };
                                        setErrors(prev => ({ ...prev, scenarios: newErrors }));
                                      }
                                    }}
                                    placeholder="Aksi yang dilakukan..."
                                    className="w-full px-3 py-2 bg-transparent border-none text-white placeholder-gray-500 focus:outline-none text-sm resize-none"
                                    minRows={1}
                                    maxRows={8}
                                  />
                                  {scenario.when.length > 1 && (
                                    <button
                                      onClick={() => removeStep(scenarioIndex, 'when', index)}
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
                              {scenario.then.map((step, index) => (
                                <div key={index} className="group relative">
                                  <AutoExpandingTextarea
                                    value={step}
                                    onChange={(e) => {
                                      updateStep(scenarioIndex, 'then', index, e.target.value);
                                      if (errors.scenarios[scenarioIndex]?.then) {
                                        const newErrors = [...errors.scenarios];
                                        newErrors[scenarioIndex] = { ...newErrors[scenarioIndex], then: '' };
                                        setErrors(prev => ({ ...prev, scenarios: newErrors }));
                                      }
                                    }}
                                    placeholder="Hasil yang diharapkan..."
                                    className="w-full px-3 py-2 bg-transparent border-none text-white placeholder-gray-500 focus:outline-none text-sm resize-none"
                                    minRows={1}
                                    maxRows={8}
                                  />
                                  {scenario.then.length > 1 && (
                                    <button
                                      onClick={() => removeStep(scenarioIndex, 'then', index)}
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
                          </div>
                        ))}

                        {/* Add Scenario Button */}
                        <div className="mt-4 mb-8">
                          <button
                            onClick={addScenario}
                            className="flex items-center gap-2 px-4 py-2 bg-transparent border border-white/5 text-white text-sm rounded-lg hover:bg-[#0D0D0D] transition-all"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Tambah Scenario
                          </button>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      </div>
                    </div>
                    
                    {/* Bottom Buttons */}
                    <div className="p-6 border-t border-white/5 bg-[#09090A]">
                      <div className="flex gap-3 justify-end">
                        <button
                          onClick={() => {
                            setShowAddForm(false);
                            setNewReference({ title: '', userStory: '', scenarios: [{ given: [''], when: [''], then: [''] }] });
                          }}
                          className="px-4 py-3 border border-white/20 text-gray-300 rounded-lg hover:bg-white/5 transition-all"
                        >
                          Batal
                        </button>
                        <button
                          onClick={saveReference}
                          disabled={!newReference.title.trim() || !newReference.userStory.trim()}
                          className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all font-semibold shadow-lg ${
                            (newReference.title.trim() && newReference.userStory.trim())
                              ? 'bg-[#120C18] border border-[#2C1A43] text-[#C27AFF] hover:bg-[#1A1220] cursor-pointer'
                              : 'bg-[#0D0D0D] border border-white/5 text-white/50 cursor-not-allowed'
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Simpan Referensi
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Reference List */
                  <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                      <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                        <div className="animate-[pulse_1.5s_ease-in-out_infinite]">
                          <img 
                            src="/logo.png"
                            alt="SpecWeave Logo"
                            className="w-24 h-24 rounded-2xl"
                          />
                        </div>
                      </div>
                    ) : filteredReferences.length === 0 ? (
                      searchTerm ? (
                        <div className="text-center py-12">
                          <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <h3 className="text-lg font-semibold text-white mb-2">Tidak ada hasil pencarian</h3>
                          <p className="text-gray-400 mb-4">
                            Coba ubah kata kunci pencarian Anda atau tambah referensi baru
                          </p>
                          <button
                            onClick={() => setShowAddForm(true)}
                            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all"
                          >
                            Tambah Referensi
                          </button>
                        </div>
                      ) : (
                        <ReferenceLibraryEmptyState 
                          onAddReference={() => setShowAddForm(true)}
                        />
                      )
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {filteredReferences.map((reference) => {
                          const scenarios = gherkinToStructured(reference.gherkinContent);
                          const isExpanded = expandedRefs[reference.id];
                          
                          return (
                            <div key={reference.id} className="bg-[#09090A] border border-white/5 rounded-lg overflow-hidden hover:border-white/10 transition-all">
                              {/* Accordion Header */}
                              <div 
                                className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#0D0D0D] transition-colors"
                                onClick={() => toggleReference(reference.id)}
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-3">
                                    <div className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                    </div>
                                    <div>
                                      <h4 className="text-lg font-semibold text-white">{reference.title}</h4>
                                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                                        <span className="flex items-center gap-1">
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                          </svg>
                                          {reference.usageCount || 0}x digunakan
                                        </span>
                                        <span className="flex items-center gap-1">
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                          </svg>
                                          {scenarios.length} scenario{scenarios.length > 1 ? 's' : ''}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClick(reference);
                                  }}
                                  className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                                  style={{ color: '#EE4038' }}
                                  onMouseEnter={(e) => e.currentTarget.style.color = '#f1554d'}
                                  onMouseLeave={(e) => e.currentTarget.style.color = '#EE4038'}
                                  title="Hapus referensi"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>

                              {/* Accordion Content - Multiple Gherkin Scenarios */}
                              {isExpanded && (
                                <div className="border-t border-white/5 bg-[#09090A]">
                                  {/* User Story Section (if available) */}
                                  {reference.userStory && (
                                    <div className="p-6 pb-0">
                                      <div className="bg-[#0D0D0D] border border-white/5 rounded-lg p-4">
                                        <div className="flex flex-col gap-2">
                                          <h5 className="text-sm font-semibold text-gray-400">User Story (Input)</h5>
                                          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                                            {reference.userStory}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  
                                  <div className="p-6 space-y-6">
                                    {/* Section Header untuk Output */}
                                    <h5 className="text-sm font-semibold text-gray-400 mb-2">Gherkin Scenarios (Output)</h5>
                                    
                                    {scenarios.map((scenario, scenarioIndex) => (
                                      <div key={scenarioIndex}>
                                        {/* Gherkin Table - Same design as ComparisonTable */}
                                        <div className="bg-gradient-to-br from-[#09090A] to-[#09090A] border border-white/5 rounded-xl overflow-hidden shadow-inner">
                                          <table className="w-full">
                                            <tbody>
                                              {/* Given Section */}
                                              {scenario.given.some(s => s.trim()) && (
                                                <tr className="border-b border-white/5 group/row transition-colors">
                                                  <td className="px-4 py-4 bg-green-500/10 border-r border-white/5 w-20">
                                                    <div className="flex items-center gap-2">
                                                      <div className="w-2 h-2 rounded-full bg-green-400"></div>
                                                      <span className="text-green-400 font-mono text-xs font-bold">GIVEN</span>
                                                    </div>
                                                  </td>
                                                  <td className="px-4 py-4 text-gray-200 text-sm leading-relaxed">
                                                    <div className="space-y-2">
                                                      {scenario.given.filter(s => s.trim()).map((step, i) => (
                                                        <div key={i} className="break-words">
                                                          {step}
                                                        </div>
                                                      ))}
                                                    </div>
                                                  </td>
                                                </tr>
                                              )}

                                              {/* When Section */}
                                              {scenario.when.some(s => s.trim()) && (
                                                <tr className="border-b border-white/5 group/row transition-colors">
                                                  <td className="px-4 py-4 bg-blue-500/10 border-r border-white/5 w-20">
                                                    <div className="flex items-center gap-2">
                                                      <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                                                      <span className="text-blue-400 font-mono text-xs font-bold">WHEN</span>
                                                    </div>
                                                  </td>
                                                  <td className="px-4 py-4 text-gray-200 text-sm leading-relaxed">
                                                    <div className="space-y-2">
                                                      {scenario.when.filter(s => s.trim()).map((step, i) => (
                                                        <div key={i} className="break-words">
                                                          {step}
                                                        </div>
                                                      ))}
                                                    </div>
                                                  </td>
                                                </tr>
                                              )}

                                              {/* Then Section */}
                                              {scenario.then.some(s => s.trim()) && (
                                                <tr className="group/row transition-colors">
                                                  <td className="px-4 py-4 bg-purple-500/10 border-r border-white/5 w-20">
                                                    <div className="flex items-center gap-2">
                                                      <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                                                      <span className="text-purple-400 font-mono text-xs font-bold">THEN</span>
                                                    </div>
                                                  </td>
                                                  <td className="px-4 py-4 text-gray-200 text-sm leading-relaxed">
                                                    <div className="space-y-2">
                                                      {scenario.then.filter(s => s.trim()).map((step, i) => (
                                                        <div key={i} className="break-words">
                                                          {step}
                                                        </div>
                                                      ))}
                                                    </div>
                                                  </td>
                                                </tr>
                                              )}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
        </div>
      </div>

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setReferenceToDelete(null);
        }}
        onConfirm={confirmDeleteReference}
        title="Hapus referensi"
        message="Apakah Anda yakin ingin menghapus referensi ini? Referensi yang dihapus tidak dapat dikembalikan."
        itemName={referenceToDelete?.title}
        confirmText="Hapus"
        cancelText="Batal"
        isDangerous={true}
      />
    </>
  );
};

export default ReferenceLibraryWithAutoSettings;