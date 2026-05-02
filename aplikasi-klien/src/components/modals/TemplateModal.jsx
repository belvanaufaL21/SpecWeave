import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTemplates } from '../../hooks/useTemplates';

const TemplateModal = ({ isOpen, onClose, onSelectTemplate }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  // Custom template creation state
  const [newTemplate, setNewTemplate] = useState({
    title: '',
    description: '',
    template: '',
    category: 'custom'
  });
  const [newTemplateErrors, setNewTemplateErrors] = useState({});
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Add custom scrollbar styles
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(147, 51, 234, 0.3);
        border-radius: 3px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: rgba(147, 51, 234, 0.5);
      }
      .custom-scrollbar {
        scrollbar-width: thin;
        scrollbar-color: rgba(147, 51, 234, 0.3) transparent;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Use the templates hook for data management
  const {
    templates: hookTemplates,
    loading: templatesLoading,
    error: templatesError,
    loadTemplates,
    createTemplate,
    clearError
  } = useTemplates({ autoLoad: false }); // Back to autoLoad: false to prevent initial loading

  // Fallback templates for when API is not available
  const fallbackTemplates = [
    {
      id: 1,
      category: 'Authentication',
      title: 'User Login with Email & Password',
      description: 'Template lengkap untuk sistem login dengan validasi email dan password',
      template: 'Sebagai pengguna yang sudah terdaftar, saya ingin login ke aplikasi menggunakan email dan password saya agar dapat mengakses dashboard dan fitur-fitur yang tersedia di dalam aplikasi.',
      tags: ['login', 'authentication', 'security', 'validation', 'session'],
      preview: {
        given: 'Pengguna berada di halaman login dengan form email dan password',
        when: 'Pengguna memasukkan email dan password yang valid lalu klik tombol login',
        then: 'Sistem memvalidasi kredensial dan mengarahkan pengguna ke dashboard'
      },
      isSystem: true,
      usageCount: 45
    },
    {
      id: 2,
      category: 'Authentication',
      title: 'User Registration with Email Verification',
      description: 'Template registrasi pengguna baru dengan verifikasi email',
      template: 'Sebagai calon pengguna baru, saya ingin mendaftar akun dengan mengisi form registrasi (nama, email, password) agar dapat menggunakan semua fitur aplikasi setelah memverifikasi email saya.',
      tags: ['registration', 'signup', 'authentication', 'email-verification'],
      preview: {
        given: 'Calon pengguna berada di halaman registrasi',
        when: 'Pengguna mengisi form registrasi dengan data lengkap dan valid',
        then: 'Sistem membuat akun baru dan mengirim email verifikasi'
      },
      isSystem: true,
      usageCount: 41
    },
    {
      id: 3,
      category: 'E-commerce',
      title: 'Product Catalog with Search',
      description: 'Template katalog produk dengan pencarian dan filter',
      template: 'Sebagai customer, saya ingin melihat katalog produk dengan fitur pencarian dan filter (kategori, harga, rating) agar dapat menemukan produk yang sesuai dengan kebutuhan saya.',
      tags: ['product', 'catalog', 'ecommerce', 'search', 'filter'],
      preview: {
        given: 'Customer berada di halaman katalog produk',
        when: 'Customer menggunakan fitur pencarian dan filter produk',
        then: 'Sistem menampilkan produk yang sesuai dengan kriteria pencarian'
      },
      isSystem: true,
      usageCount: 32
    },
    {
      id: 4,
      category: 'E-commerce',
      title: 'Shopping Cart Management',
      description: 'Template keranjang belanja dengan validasi stok',
      template: 'Sebagai customer, saya ingin menambahkan produk ke keranjang belanja dan mengubah quantity agar dapat membeli beberapa produk sekaligus dengan mudah.',
      tags: ['cart', 'shopping', 'ecommerce', 'quantity', 'checkout'],
      preview: {
        given: 'Customer memilih produk yang ingin dibeli',
        when: 'Customer menambahkan produk ke keranjang dan mengubah quantity',
        then: 'Sistem memvalidasi stok dan menghitung total harga'
      },
      isSystem: true,
      usageCount: 28
    },
    {
      id: 5,
      category: 'Reporting',
      title: 'Sales Analytics Dashboard',
      description: 'Template dashboard analytics dengan visualisasi data',
      template: 'Sebagai business manager, saya ingin melihat laporan penjualan dalam bentuk grafik dan chart (harian, mingguan, bulanan) agar dapat menganalisis performa bisnis dan membuat keputusan strategis.',
      tags: ['analytics', 'dashboard', 'sales', 'charts', 'reporting'],
      preview: {
        given: 'Business manager berada di dashboard analytics',
        when: 'Manager memilih periode waktu dan jenis laporan yang diinginkan',
        then: 'Sistem menampilkan grafik dan KPI yang relevan dengan opsi export'
      },
      isSystem: true,
      usageCount: 19
    },
    {
      id: 6,
      category: 'E-commerce',
      title: 'Payment Processing',
      description: 'Template sistem pembayaran dengan multiple gateway',
      template: 'Sebagai customer yang ingin checkout, saya ingin melakukan pembayaran dengan berbagai metode (kartu kredit, e-wallet, bank transfer) agar dapat menyelesaikan pembelian dengan mudah dan aman.',
      tags: ['payment', 'checkout', 'transaction', 'gateway', 'security'],
      preview: {
        given: 'Customer telah memilih produk dan siap melakukan pembayaran',
        when: 'Customer memilih metode pembayaran dan mengisi detail pembayaran',
        then: 'Sistem memproses pembayaran melalui gateway dan memberikan konfirmasi'
      },
      isSystem: true,
      usageCount: 23
    },
    {
      id: 7,
      category: 'Communication',
      title: 'Real-time Notification System',
      description: 'Template sistem notifikasi multi-channel',
      template: 'Sebagai pengguna aplikasi, saya ingin menerima notifikasi penting (pesanan baru, pembayaran berhasil, promo) melalui email dan push notification agar selalu terinformasi tentang aktivitas terkini.',
      tags: ['notification', 'realtime', 'email', 'push', 'alerts'],
      preview: {
        given: 'Pengguna telah mengatur preferensi notifikasi',
        when: 'Sistem perlu mengirim notifikasi kepada pengguna',
        then: 'Notifikasi dikirim melalui channel yang dipilih sesuai preferensi'
      },
      isSystem: true,
      usageCount: 15
    },
    {
      id: 8,
      category: 'Authentication',
      title: 'Password Reset via Email',
      description: 'Template reset password melalui email dengan keamanan yang baik',
      template: 'Sebagai pengguna yang lupa password, saya ingin mereset password melalui link yang dikirim ke email saya agar dapat mengakses kembali akun saya dengan aman.',
      tags: ['password', 'reset', 'recovery', 'security', 'email'],
      preview: {
        given: 'Pengguna lupa password dan berada di halaman reset password',
        when: 'Pengguna memasukkan email dan mengikuti proses reset password',
        then: 'Sistem mengirim email reset dan memungkinkan pengguna membuat password baru'
      },
      isSystem: true,
      usageCount: 12
    }
  ];

  // Use hook templates if available, otherwise fallback
  const templates = hookTemplates.length > 0 ? hookTemplates.map(template => {
    return {
      ...template,
      // Map API response fields to component expected fields
      id: template.id,
      title: template.name || template.title,
      template: template.template_content || template.template,
      category: template.category,
      description: template.description,
      tags: template.tags || [],
      isSystem: template.is_system !== undefined ? template.is_system : template.isSystem,
      usageCount: template.usage_count !== undefined ? template.usage_count : template.usageCount,
      preview: template.preview || {
        given: 'Kondisi awal sistem',
        when: 'Aksi yang dilakukan user', 
        then: 'Hasil yang diharapkan'
      }
    };
  }) : fallbackTemplates;

  // Helper function to get category information
  const getCategoryInfo = (categoryId) => {
    const categoryMap = {
      'Authentication': { name: 'Authentication', icon: '🔐' },
      'User Management': { name: 'User Management', icon: '👥' },
      'Administration': { name: 'Administration', icon: '⚙️' },
      'E-commerce': { name: 'E-commerce', icon: '🛒' },
      'Inventory': { name: 'Inventory', icon: '📦' },
      'Reporting': { name: 'Reporting', icon: '📊' },
      'Communication': { name: 'Communication', icon: '📢' },
      'Content Management': { name: 'Content Management', icon: '📝' },
      'Customer Service': { name: 'Customer Service', icon: '🎧' },
      'SaaS Platform': { name: 'SaaS Platform', icon: '☁️' },
      // Legacy support for old categories
      auth: { name: 'Authentication', icon: '🔐' },
      crud: { name: 'CRUD Operations', icon: '📝' },
      ecommerce: { name: 'E-commerce', icon: '🛒' },
      analytics: { name: 'Analytics', icon: '📊' },
      ui: { name: 'User Interface', icon: '🎨' },
      api: { name: 'API Integration', icon: '🔌' },
      workflow: { name: 'Workflow', icon: '⚡' },
      custom: { name: 'Custom Templates', icon: '✨' }
    };
    
    return categoryMap[categoryId] || { name: categoryId, icon: '📄' };
  };

  // Generate categories from templates
  const categories = useMemo(() => {
    const categoryMap = new Map();
    
    // Add "all" category
    categoryMap.set('all', {
      id: 'all',
      name: 'Semua Template',
      count: templates.length,
      icon: '📋'
    });

    // Count templates by category
    templates.forEach(template => {
      const category = template.category;
      if (categoryMap.has(category)) {
        categoryMap.get(category).count++;
      } else {
        const categoryInfo = getCategoryInfo(category);
        categoryMap.set(category, {
          id: category,
          name: categoryInfo.name,
          count: 1,
          icon: categoryInfo.icon
        });
      }
    });

    return Array.from(categoryMap.values());
  }, [templates]);

  // Enhanced search and filter logic with keyword highlighting
  const filteredTemplates = useMemo(() => {
    return templates.filter(template => {
      const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
      
      if (!searchQuery) return matchesCategory;
      
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        template.title.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.template.toLowerCase().includes(query) ||
        template.tags.some(tag => tag.toLowerCase().includes(query));
      
      return matchesCategory && matchesSearch;
    }).sort((a, b) => {
      // Sort by usage count (most used first)
      return (b.usageCount || 0) - (a.usageCount || 0);
    });
  }, [templates, selectedCategory, searchQuery]);

  // Highlight search keywords in text
  const highlightKeywords = (text, keywords) => {
    if (!keywords) return text;
    
    const regex = new RegExp(`(${keywords.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-400/30 text-yellow-200 px-1 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  // Handle keyboard navigation for template selection
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isOpen) return;
      
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Load templates when modal opens - fixed to prevent infinite loop
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setShowCreateForm(false);
      setSelectedTemplateId(null);
      clearError();
    }
  }, [isOpen, clearError]);

  // Separate effect for loading templates to avoid infinite loop
  const [hasTriedLoading, setHasTriedLoading] = useState(false);
  
  useEffect(() => {
    if (isOpen && !hasTriedLoading && hookTemplates.length === 0 && !templatesLoading) {
      
      setHasTriedLoading(true);
      loadTemplates().catch(error => {
        console.error('❌ [TEMPLATE-MODAL] Failed to load templates:', error);
      });
    }
    
    // Reset the flag when modal closes
    if (!isOpen) {
      setHasTriedLoading(false);
    }
  }, [isOpen, hasTriedLoading, hookTemplates.length, templatesLoading, loadTemplates]);

  const handleSelectTemplate = async (template) => {
    setIsLoading(true);
    setSelectedTemplateId(template.id);
    
    console.log('🔍 [TEMPLATE-MODAL] Template selected:', {
      id: template.id,
      title: template.title,
      template: template.template,
      templateLength: template.template?.length,
      templateType: typeof template.template
    });
    
    try {
      // Simulate loading for better UX
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Validate template content
      if (!template.template || typeof template.template !== 'string' || template.template.trim().length === 0) {
        console.error('Invalid template content:', template.template);
        throw new Error('Template content is empty or invalid');
      }
      
      // Call the parent callback with the template content
      onSelectTemplate(template.template);
      
      // Close modal with success feedback
      onClose();
      
      // Show success notification (if notification system is available)
      if (window.showNotification) {
        window.showNotification('Template berhasil diterapkan!', 'success');
      }
    } catch (error) {
      console.error('Failed to apply template:', error);
      
      // Show error notification
      if (window.showNotification) {
        window.showNotification('Gagal menerapkan template. Silakan coba lagi.', 'error');
      }
    } finally {
      setIsLoading(false);
      setSelectedTemplateId(null);
    }
  };

  // Validate new template
  const validateNewTemplate = () => {
    const errors = {};
    
    if (!newTemplate.title.trim()) {
      errors.title = 'Judul template harus diisi';
    }
    
    if (!newTemplate.description.trim()) {
      errors.description = 'Deskripsi template harus diisi';
    }
    
    if (!newTemplate.template.trim()) {
      errors.template = 'User story template harus diisi';
    } else if (!newTemplate.template.toLowerCase().includes('sebagai')) {
      errors.template = 'User story harus menggunakan format "Sebagai... saya ingin... agar..."';
    }
    
    setNewTemplateErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle template creation
  const handleCreateTemplate = async () => {
    if (!validateNewTemplate()) return;
    
    setIsCreatingTemplate(true);
    
    try {
      const templateData = {
        ...newTemplate,
        id: Date.now(), // Temporary ID for fallback
        isSystem: false,
        usageCount: 0,
        tags: [], // Empty tags array
        preview: {
          given: 'Kondisi awal sistem',
          when: 'Aksi yang dilakukan user',
          then: 'Hasil yang diharapkan'
        }
      };
      
      // Try to create via service
      if (createTemplate) {
        await createTemplate(templateData);
      } else {
        // Fallback: add to local state (for demo purposes)
        console.log('Created template:', templateData);
      }
      
      // Reset form
      setNewTemplate({
        title: '',
        description: '',
        template: '',
        category: 'custom'
      });
      setNewTemplateErrors({});
      setShowCreateForm(false);
      
      // Show success message
      if (window.showNotification) {
        window.showNotification('Template berhasil dibuat!', 'success');
      }
      
    } catch (error) {
      console.error('Failed to create template:', error);
      if (window.showNotification) {
        window.showNotification('Gagal membuat template. Silakan coba lagi.', 'error');
      }
    } finally {
      setIsCreatingTemplate(false);
    }
  };



  const retryLoadTemplates = async () => {
    try {
      clearError();
      await loadTemplates();
    } catch (error) {
      console.error('Retry failed:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div 
          className="bg-[#09090A] border border-white/5 rounded-xl w-full max-w-6xl max-h-[85vh] overflow-hidden shadow-2xl"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/5">
            <div>
              <h2 className="text-xl font-bold text-white">User Story Templates</h2>
              <p className="text-gray-400 text-sm mt-1">Choose a template to get started quickly</p>
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

          <div className="flex h-[65vh] overflow-hidden">
            {/* Categories Sidebar */}
            <div className="w-80 border-r border-white/5 p-6 flex flex-col max-h-full overflow-x-hidden flex-shrink-0">
              
              {/* Search */}
              <div className="relative mb-6 flex-shrink-0">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[#0D0D0D] border border-white/5 rounded-lg text-sm text-white/50 placeholder-white/50 focus:outline-none focus:border-purple-500/50 focus:text-white transition-colors"
                />
              </div>

              {/* Category List */}
              <div 
                className="space-y-2 overflow-y-auto overflow-x-hidden flex-1 custom-scrollbar pr-2"
              >
                {templatesLoading ? (
                  // Loading skeleton for categories
                  Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="w-full px-4 py-3 rounded-lg bg-gradient-to-br from-[#020203]/80 to-black/90 animate-pulse">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 bg-gray-600 rounded"></div>
                          <div className="w-20 h-4 bg-gray-600 rounded"></div>
                        </div>
                        <div className="w-6 h-4 bg-gray-600 rounded-full"></div>
                      </div>
                    </div>
                  ))
                ) : (
                  categories.map((category) => (
                    <motion.button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all flex items-center justify-between outline-none focus:outline-none focus-visible:outline-none active:outline-none [&:focus]:outline-none [&:active]:outline-none ${
                        selectedCategory === category.id
                          ? 'bg-[#120C18] text-[#C27AFF] border border-[#2C1A43]'
                          : 'text-white/30 hover:text-white/50 border border-transparent'
                      }`}
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="truncate">{category.name}</span>
                      </div>
                      <span className="text-xs bg-transparent px-2 py-1 rounded-full flex-shrink-0 ml-2">
                        {category.count}
                      </span>
                    </motion.button>
                  ))
                )}
              </div>
            </div>

            {/* Templates Grid */}
            <div className="flex-1 p-6 overflow-y-auto overflow-x-hidden">
              {templatesLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Memuat Template</h3>
                  <p className="text-gray-400 text-sm">Sedang mengambil template terbaru...</p>
                </div>
              ) : templatesError ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Gagal Memuat Template</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    Terjadi kesalahan saat memuat template. Silakan coba lagi.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={retryLoadTemplates}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Coba Lagi
                    </button>
                    <button
                      onClick={() => setShowCreateForm(true)}
                      className="px-4 py-2 bg-[#120C18] text-[#C27AFF] border border-[#2C1A43] rounded-lg hover:bg-[#1A1020] transition-colors font-medium"
                    >
                      Buat Template
                    </button>
                  </div>
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Tidak ada template ditemukan</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    {searchQuery ? 'Coba ubah kata kunci pencarian atau filter kategori' : 'Belum ada template tersedia'}
                  </p>
                  {!searchQuery && (
                    <button
                      onClick={() => setShowCreateForm(true)}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium"
                    >
                      Buat Template Pertama
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
                  {filteredTemplates.map((template, index) => (
                    <motion.div
                      key={template.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="group relative"
                    >
                      <div
                        onClick={() => handleSelectTemplate(template)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSelectTemplate(template);
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        aria-label={`Gunakan template ${template.title}`}
                        className={`p-6 bg-[#09090A] border border-white/5 rounded-xl hover:border-[#2C1A43] focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all cursor-pointer h-full flex flex-col ${
                          selectedTemplateId === template.id ? 'ring-2 ring-green-500/50 border-green-500/30' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h4 className="font-semibold text-white group-hover:text-white transition-colors text-lg mb-1">
                              {highlightKeywords(template.title, searchQuery)}
                            </h4>
                            {/* Template metadata */}
                          </div>
                        </div>
                        
                        <p className="text-gray-400 text-sm mb-4 group-hover:text-gray-300 transition-colors flex-1">
                          {highlightKeywords(template.description, searchQuery)}
                        </p>
                        
                        {/* User Story Preview - Truncated */}
                        <div className="bg-[#0D0D0D] border border-white/5 rounded-lg p-4 mb-4">
                          <p className="text-white text-sm italic leading-relaxed line-clamp-3">
                            "{template.template ? highlightKeywords(template.template.substring(0, 200) + (template.template.length > 200 ? '...' : ''), searchQuery) : 'No template content available'}"
                          </p>
                          {!template.template && (
                            <p className="text-red-400 text-xs mt-2">
                              Debug: template_content = {template.template_content ? 'exists' : 'missing'}, 
                              template = {template.template ? 'exists' : 'missing'}
                            </p>
                          )}
                        </div>
                        
                        {/* Click to use indicator */}
                        <div className="mt-auto pt-3 border-t border-white/10">
                          <p className="text-xs text-gray-500 group-hover:text-white/70 transition-colors text-center flex items-center justify-center gap-2">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                            </svg>
                            Klik untuk menggunakan template ini
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-white/5 bg-[#09090A]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <p className="text-gray-400 text-sm">
                  {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} tersedia
                </p>
                {templatesError && (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Gagal memuat template
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="px-4 py-2 bg-[#120C18] text-[#C27AFF] border border-[#2C1A43] rounded-lg hover:bg-[#1A1020] transition-colors text-sm font-medium"
                  disabled={isLoading || templatesLoading}
                >
                  <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Buat Template
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Create Template Modal */}
        <AnimatePresence>
          {showCreateForm && (
            <motion.div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-60 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateForm(false)}
            >
              <motion.div
                className="bg-[#09090A] border border-white/5 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Create Form Content */}
                <div className="p-8 relative overflow-y-auto max-h-[90vh]">
                  {/* Close Button */}
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-[#160D14] border border-[#44273D] flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                      <h2 className="text-xl font-bold text-white">Buat Template Baru</h2>
                    </div>
                    <p className="text-gray-400 text-sm">
                      Buat template user story kustom untuk digunakan kembali
                    </p>
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); handleCreateTemplate(); }} className="space-y-4">
                    {/* Title Field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Judul Template <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={newTemplate.title}
                        onChange={(e) => setNewTemplate(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Contoh: User Login Process"
                        className={`w-full px-4 py-3 bg-[#0D0D0D] border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-0 focus:bg-[#0D0D0D] transition-all ${
                          newTemplateErrors.title ? 'border-red-500/50 focus:border-red-500' : 'border-white/5 focus:border-white/50'
                        }`}
                        required
                      />
                      {newTemplateErrors.title && (
                        <p className="text-red-400 text-xs mt-1">{newTemplateErrors.title}</p>
                      )}
                    </div>

                    {/* Description Field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Deskripsi Template <span className="text-red-400">*</span>
                      </label>
                      <textarea
                        value={newTemplate.description}
                        onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Jelaskan kapan template ini sebaiknya digunakan..."
                        rows={3}
                        className={`w-full px-4 py-3 bg-[#0D0D0D] border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-0 focus:bg-[#0D0D0D] transition-all resize-none ${
                          newTemplateErrors.description ? 'border-red-500/50 focus:border-red-500' : 'border-white/5 focus:border-white/50'
                        }`}
                        required
                      />
                      {newTemplateErrors.description && (
                        <p className="text-red-400 text-xs mt-1">{newTemplateErrors.description}</p>
                      )}
                    </div>

                    {/* Category Field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Kategori
                      </label>
                      <select
                        value={newTemplate.category}
                        onChange={(e) => setNewTemplate(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full px-4 py-3 bg-[#0D0D0D] border border-white/5 rounded-lg text-white focus:outline-none focus:ring-0 focus:bg-[#0D0D0D] focus:border-white/50 transition-all"
                      >
                        <option value="custom">Custom</option>
                        <option value="Authentication">Authentication</option>
                        <option value="User Management">User Management</option>
                        <option value="Administration">Administration</option>
                        <option value="E-commerce">E-commerce</option>
                        <option value="Inventory">Inventory</option>
                        <option value="Reporting">Reporting</option>
                        <option value="Communication">Communication</option>
                        <option value="Content Management">Content Management</option>
                        <option value="Customer Service">Customer Service</option>
                        <option value="SaaS Platform">SaaS Platform</option>
                      </select>
                    </div>

                    {/* User Story Template Field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        User Story Template <span className="text-red-400">*</span>
                      </label>
                      <textarea
                        value={newTemplate.template}
                        onChange={(e) => setNewTemplate(prev => ({ ...prev, template: e.target.value }))}
                        placeholder="Sebagai [role], saya ingin [feature] agar [benefit]..."
                        rows={4}
                        className={`w-full px-4 py-3 bg-[#0D0D0D] border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-0 focus:bg-[#0D0D0D] transition-all resize-none ${
                          newTemplateErrors.template ? 'border-red-500/50 focus:border-red-500' : 'border-white/5 focus:border-white/50'
                        }`}
                        required
                      />
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-gray-500">
                          Gunakan format standar user story: "Sebagai... saya ingin... agar..."
                        </p>
                        {newTemplateErrors.template && (
                          <p className="text-red-400 text-xs">{newTemplateErrors.template}</p>
                        )}
                      </div>
                    </div>

                    {/* Tags Field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Tags <span className="text-red-400">*</span>
                      </label>
                    </div>

                    <div className="pt-4">
                      <button
                        type="submit"
                        disabled={isCreatingTemplate || !newTemplate.title || !newTemplate.description || !newTemplate.template}
                        className="w-full px-4 py-3 bg-[#160D14] border border-[#44273D] text-[#FF7AD0] rounded-lg font-medium hover:bg-[#1a1016] transition-all duration-200 disabled:bg-[#0D0D0D] disabled:border-white/5 disabled:text-white/10 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isCreatingTemplate ? (
                          <>
                            <div className="w-4 h-4 border-2 border-[#FF7AD0]/30 border-t-[#FF7AD0] rounded-full animate-spin"></div>
                            Membuat Template...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Buat Template
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading Overlay */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="bg-[#09090A] border border-white/5 rounded-lg p-6 flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-[#C27AFF] border-t-transparent rounded-full animate-spin" />
                <span className="text-[#C27AFF] font-medium">Applying template...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};

export default TemplateModal;