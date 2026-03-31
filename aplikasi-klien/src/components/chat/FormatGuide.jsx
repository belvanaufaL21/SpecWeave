import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const FormatGuide = ({ isVisible, onClose, onInsertTemplate }) => {
  const [activeTab, setActiveTab] = useState('format');

  const examples = [
    {
      category: 'Authentication',
      english: 'As a user, I want to login with email and password so that I can access my account securely.',
      indonesian: 'Sebagai pengguna, saya ingin login menggunakan email dan password agar dapat mengakses akun saya dengan aman.'
    },
    {
      category: 'E-commerce',
      english: 'As a customer, I want to track my order status so that I know when my package will arrive.',
      indonesian: 'Sebagai customer, saya ingin melacak status pesanan agar dapat mengetahui kapan paket saya akan tiba.'
    },
    {
      category: 'Administration',
      english: 'As an admin, I want to manage user permissions so that I can control system access.',
      indonesian: 'Sebagai admin, saya ingin mengelola hak akses pengguna agar dapat mengontrol akses sistem.'
    }
  ];

  const formatComponents = [
    {
      component: 'Role',
      english: 'As a [role]',
      indonesian: 'Sebagai [peran]',
      description: 'Who is the user? (customer, admin, manager, etc.)',
      examples: ['As a customer', 'Sebagai admin', 'As a project manager']
    },
    {
      component: 'Feature',
      english: 'I want [feature]',
      indonesian: 'saya ingin [fitur]',
      description: 'What functionality do they want?',
      examples: ['I want to login', 'saya ingin melihat laporan', 'I want to export data']
    },
    {
      component: 'Benefit',
      english: 'so that [benefit]',
      indonesian: 'agar [manfaat]',
      description: 'Why do they want it? What value does it provide?',
      examples: ['so that I can access my account', 'agar dapat menganalisis data', 'so that I can track progress']
    }
  ];

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-[#1a1a1a] border border-gray-700/50 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-700/30">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white mb-1">User Story Format Guide</h2>
                <p className="text-gray-400 text-sm">Learn the Connextra format for better Gherkin scenarios</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mt-4 bg-gray-800/30 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('format')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'format'
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                Format Structure
              </button>
              <button
                onClick={() => setActiveTab('examples')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'examples'
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                Examples
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {activeTab === 'format' && (
              <div className="space-y-6">
                {/* Format Overview */}
                <div className="bg-gradient-to-r from-purple-600/10 to-blue-600/10 border border-purple-500/20 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Connextra Format</h3>
                  <div className="space-y-3">
                    <div className="bg-gray-800/50 rounded-lg p-4 font-mono text-sm">
                      <div className="text-blue-400">As a <span className="text-yellow-400">[role]</span>,</div>
                      <div className="text-green-400">I want <span className="text-yellow-400">[feature]</span>,</div>
                      <div className="text-purple-400">so that <span className="text-yellow-400">[benefit]</span></div>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-4 font-mono text-sm">
                      <div className="text-blue-400">Sebagai <span className="text-yellow-400">[peran]</span>,</div>
                      <div className="text-green-400">saya ingin <span className="text-yellow-400">[fitur]</span>,</div>
                      <div className="text-purple-400">agar <span className="text-yellow-400">[manfaat]</span></div>
                    </div>
                  </div>
                </div>

                {/* Components Breakdown */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Format Components</h3>
                  {formatComponents.map((comp, index) => (
                    <div key={index} className="bg-gray-800/30 border border-gray-700/30 rounded-xl p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-purple-400 font-semibold">{index + 1}</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-white font-semibold mb-2">{comp.component}</h4>
                          <div className="space-y-2 mb-3">
                            <div className="bg-gray-900/50 rounded-lg p-3 font-mono text-sm">
                              <div className="text-blue-300">{comp.english}</div>
                              <div className="text-green-300">{comp.indonesian}</div>
                            </div>
                          </div>
                          <p className="text-gray-400 text-sm mb-3">{comp.description}</p>
                          <div className="flex flex-wrap gap-2">
                            {comp.examples.map((example, i) => (
                              <span key={i} className="px-3 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full border border-purple-500/30">
                                {example}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => onInsertTemplate('As a [role], I want [feature], so that [benefit]')}
                    className="flex-1 p-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20 hover:from-blue-600/30 hover:to-purple-600/30 border border-blue-500/30 hover:border-purple-500/40 rounded-xl transition-all duration-300 text-center group"
                  >
                    <div className="text-white font-medium mb-1">Use English Template</div>
                    <div className="text-gray-400 text-sm">As a [role], I want [feature]...</div>
                  </button>
                  <button
                    onClick={() => onInsertTemplate('Sebagai [peran], saya ingin [fitur], agar [manfaat]')}
                    className="flex-1 p-4 bg-gradient-to-r from-green-600/20 to-blue-600/20 hover:from-green-600/30 hover:to-blue-600/30 border border-green-500/30 hover:border-blue-500/40 rounded-xl transition-all duration-300 text-center group"
                  >
                    <div className="text-white font-medium mb-1">Use Indonesian Template</div>
                    <div className="text-gray-400 text-sm">Sebagai [peran], saya ingin [fitur]...</div>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'examples' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Real-World Examples</h3>
                  <p className="text-gray-400 mb-6">Here are some well-written user stories in both English and Indonesian:</p>
                </div>

                <div className="space-y-6">
                  {examples.map((example, index) => (
                    <div key={index} className="bg-gray-800/30 border border-gray-700/30 rounded-xl p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center">
                          <span className="text-purple-400 font-semibold text-sm">{index + 1}</span>
                        </div>
                        <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-sm rounded-full border border-blue-500/30">
                          {example.category}
                        </span>
                      </div>

                      <div className="space-y-4">
                        <div className="bg-gray-900/50 rounded-lg p-4">
                          <div className="text-xs text-gray-500 mb-2">English</div>
                          <div className="text-white leading-relaxed">{example.english}</div>
                        </div>
                        <div className="bg-gray-900/50 rounded-lg p-4">
                          <div className="text-xs text-gray-500 mb-2">Indonesian</div>
                          <div className="text-white leading-relaxed">{example.indonesian}</div>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => onInsertTemplate(example.english)}
                          className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-sm rounded-lg border border-blue-500/30 hover:border-blue-500/50 transition-all"
                        >
                          Use English Version
                        </button>
                        <button
                          onClick={() => onInsertTemplate(example.indonesian)}
                          className="px-4 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-300 text-sm rounded-lg border border-green-500/30 hover:border-green-500/50 transition-all"
                        >
                          Use Indonesian Version
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tips */}
                <div className="bg-gradient-to-r from-yellow-600/10 to-orange-600/10 border border-yellow-500/20 rounded-xl p-6">
                  <h4 className="text-yellow-400 font-semibold mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Writing Tips
                  </h4>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-400 mt-1">•</span>
                      <span>Be specific about the role (avoid generic "user" when possible)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-400 mt-1">•</span>
                      <span>Focus on one feature per user story</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-400 mt-1">•</span>
                      <span>Clearly explain the business value in the "so that" part</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-400 mt-1">•</span>
                      <span>Keep it concise but descriptive</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FormatGuide;