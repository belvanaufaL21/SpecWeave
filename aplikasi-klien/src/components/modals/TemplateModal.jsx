import { useState } from 'react';

const TemplateModal = ({ isOpen, onClose, onSelectTemplate }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const templates = [
    {
      id: 1,
      category: 'auth',
      title: 'User Authentication',
      description: 'Login flow implementation',
      template: 'Sebagai pengguna, saya ingin login menggunakan email dan password agar dapat mengakses dashboard aplikasi.',
      tags: ['login', 'authentication', 'security']
    },
    {
      id: 2,
      category: 'crud',
      title: 'Product Management',
      description: 'CRUD operations for products',
      template: 'Sebagai product manager, saya ingin membuat dan mengelola daftar produk agar customer dapat melihat penawaran kami.',
      tags: ['product', 'management', 'crud']
    },
    {
      id: 3,
      category: 'ecommerce',
      title: 'Shopping Cart',
      description: 'Checkout process scenario',
      template: 'Sebagai customer, saya ingin menambahkan item ke keranjang belanja dan menyelesaikan proses checkout.',
      tags: ['cart', 'checkout', 'ecommerce']
    },
    {
      id: 4,
      category: 'analytics',
      title: 'Analytics Dashboard',
      description: 'Visualize data metrics',
      template: 'Sebagai admin, saya ingin melihat metrik pengguna dan melacak performa platform di dashboard.',
      tags: ['analytics', 'dashboard', 'metrics']
    },
    {
      id: 5,
      category: 'auth',
      title: 'User Registration',
      description: 'Sign up process',
      template: 'Sebagai pengguna baru, saya ingin mendaftar akun dengan email dan password agar dapat menggunakan layanan.',
      tags: ['registration', 'signup', 'onboarding']
    },
    {
      id: 6,
      category: 'crud',
      title: 'Data Export',
      description: 'Export functionality',
      template: 'Sebagai admin, saya ingin mengekspor data dalam format CSV atau Excel untuk analisis lebih lanjut.',
      tags: ['export', 'data', 'csv', 'excel']
    },
    {
      id: 7,
      category: 'ecommerce',
      title: 'Payment Processing',
      description: 'Payment gateway integration',
      template: 'Sebagai customer, saya ingin melakukan pembayaran dengan berbagai metode pembayaran yang aman.',
      tags: ['payment', 'gateway', 'security']
    },
    {
      id: 8,
      category: 'analytics',
      title: 'Report Generation',
      description: 'Generate business reports',
      template: 'Sebagai manager, saya ingin menghasilkan laporan penjualan bulanan untuk evaluasi performa tim.',
      tags: ['report', 'sales', 'monthly']
    }
  ];

  const categories = [
    { id: 'all', name: 'All Templates', count: templates.length },
    { id: 'auth', name: 'Authentication', count: templates.filter(t => t.category === 'auth').length },
    { id: 'crud', name: 'CRUD Operations', count: templates.filter(t => t.category === 'crud').length },
    { id: 'ecommerce', name: 'E-commerce', count: templates.filter(t => t.category === 'ecommerce').length },
    { id: 'analytics', name: 'Analytics', count: templates.filter(t => t.category === 'analytics').length }
  ];

  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(t => t.category === selectedCategory);

  const handleSelectTemplate = (template) => {
    onSelectTemplate(template.template);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#16161e] border border-white/10 rounded-xl w-full max-w-4xl max-h-[80vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-lg font-bold text-white">User Story Templates</h2>
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

        <div className="flex h-[60vh]">
          {/* Categories Sidebar */}
          <div className="w-64 border-r border-white/10 p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">Categories</h3>
            <div className="space-y-1">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                    selectedCategory === category.id
                      ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                      : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'
                  }`}
                >
                  <span>{category.name}</span>
                  <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full">
                    {category.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Templates Grid */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className="p-5 bg-gradient-to-br from-white/5 to-white/10 border border-white/10 rounded-xl hover:bg-gradient-to-br hover:from-purple-500/10 hover:to-pink-500/10 hover:border-purple-500/30 transition-all group cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="font-semibold text-white group-hover:text-purple-300 transition-colors text-lg">
                      {template.title}
                    </h4>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-purple-400 transition-colors flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  
                  <p className="text-gray-400 text-sm mb-4 group-hover:text-gray-300 transition-colors">
                    {template.description}
                  </p>
                  
                  {/* User Story Preview */}
                  <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
                    <p className="text-blue-200 text-sm italic leading-relaxed">
                      "{template.template}"
                    </p>
                  </div>
                  
                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    {template.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-purple-500/10 text-purple-300 text-xs rounded-full border border-purple-500/20 group-hover:bg-purple-500/20 transition-colors"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-white/5">
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-sm">
              {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} available • Click any template to use it
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateModal;