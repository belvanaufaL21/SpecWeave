import React from 'react';

const EXAMPLE_PROMPTS = [
  {
    title: "User Authentication",
    desc: "Login flow implementation",
    fullPrompt: "Sebagai pengguna, saya ingin login menggunakan email dan password agar dapat mengakses dashboard aplikasi.",
    icon: (
      <path 
        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11.536 9.464a1 1 0 00-.707-.293h-2.5A1 1 0 007.536 9.464l-1.414 1.414a1 1 0 00-.293.707V14l-4 4 4-4m5-9a1 1 0 11-2 2m-2-2a1 1 0 112-2m7 2a4 4 0 11-8 0 4 4 0 018 0z" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={1.5}
      />
    ),
    color: "purple"
  },
  {
    title: "Product Management",
    desc: "CRUD operations for products",
    fullPrompt: "Sebagai product manager, saya ingin membuat dan mengelola daftar produk agar customer dapat melihat penawaran kami.",
    icon: (
      <path 
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={1.5}
      />
    ),
    color: "pink"
  },
  {
    title: "Shopping Cart",
    desc: "Checkout process scenario",
    fullPrompt: "Sebagai customer, saya ingin menambahkan item ke keranjang belanja dan menyelesaikan proses checkout.",
    icon: (
      <path 
        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={1.5}
      />
    ),
    color: "blue"
  },
  {
    title: "Analytics Dashboard",
    desc: "Visualize data metrics",
    fullPrompt: "Sebagai admin, saya ingin melihat metrik pengguna dan melacak performa platform di dashboard.",
    icon: (
      <path 
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={1.5}
      />
    ),
    color: "green"
  }
];

const ExampleCard = ({ example, onExampleClick }) => {
  const { title, desc, fullPrompt, icon, color = 'purple' } = example;

  return (
    <button 
      onClick={() => onExampleClick(fullPrompt)} 
      className="group flex items-start text-left p-6 rounded-3xl card-primary cursor-pointer relative overflow-hidden hover:-translate-y-1"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/5 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className={`relative z-10 mt-1 w-12 h-12 rounded-2xl bg-${color}-500/10 group-hover:bg-${color}-500/20 flex items-center justify-center mr-5 shrink-0 transition-all duration-300 border border-${color}-500/20 group-hover:scale-110 group-hover:rotate-3 shadow-lg`}>
        <svg className={`w-6 h-6 text-${color}-400 group-hover:text-${color}-300 transition-colors`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {icon}
        </svg>
      </div>
      
      <div className="relative z-10">
        <h3 className="text-base font-bold text-secondary group-hover:text-primary mb-2 transition-colors">
          {title}
        </h3>
        <p className="text-sm text-muted group-hover:text-tertiary leading-relaxed">
          {desc}
        </p>
        <div className="flex items-center gap-2 mt-3 text-xs text-accent group-hover:text-purple-300 transition-colors">
          <span>Try this example</span>
          <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </button>
  );
};

const EmptyState = ({ onExampleClick }) => {
  return (
    <div className="flex flex-col items-center w-full max-w-3xl mx-auto animate-fade-in-up px-4">
      {/* Hero Icon */}
      <div className="relative mb-12 group cursor-pointer">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 animate-pulse"></div>
        <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-tertiary to-secondary border border-primary flex items-center justify-center shadow-2xl shadow-purple-900/30 group-hover:-translate-y-2 transition-transform duration-500">
          <div className="w-12 h-12 rounded-2xl gradient-secondary flex items-center justify-center shadow-lg">
            <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Title and Description */}
      <h2 className="text-4xl font-bold gradient-text-primary mb-4 text-center tracking-tight">
        Apa yang bisa saya bantu?
      </h2>
      <p className="text-lg text-muted mb-12 text-center max-w-2xl leading-relaxed">
        Ubah user story Anda menjadi skenario Gherkin yang valid dengan bantuan AI yang powerful.
      </p>
      
      {/* Example Cards */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
        {EXAMPLE_PROMPTS.map((example, index) => (
          <ExampleCard 
            key={index} 
            example={example} 
            onExampleClick={onExampleClick} 
          />
        ))}
      </div>
    </div>
  );
};

export default EmptyState;