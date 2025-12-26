import { useState } from 'react';
import { jiraService } from '../../services/specWeaveService'; // Import service mock kita

const JiraConnectModal = ({ isOpen, onClose, onConnect }) => {
  const [step, setStep] = useState(1); // 1: Auth, 2: Select Project
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    domain: '',
    email: '',
    token: ''
  });

  const [projects, setProjects] = useState([]);

  if (!isOpen) return null;

  const handleAuth = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Panggil Mock Service
      const result = await jiraService.authenticate(formData.domain, formData.email, formData.token);
      
      if (result.success) {
        setProjects(result.projects);
        setStep(2); // Pindah ke halaman pilih project
      }
    } catch (err) {
      setError(err.message || "Gagal terhubung ke JIRA");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectProject = async (project) => {
    setIsLoading(true);
    try {
      // Simulasi koneksi ke project spesifik
      await jiraService.connectProject(project.key);
      
      // Kirim data balik ke Chat.jsx
      onConnect(project); 
      onClose();
    } catch (err) {
      setError("Gagal memilih project");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-[#16161e] border border-white/10 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <h3 className="text-sm font-bold text-white tracking-wide">
            {step === 1 ? 'Connect JIRA' : 'Select Project'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {step === 1 ? (
            /* STEP 1: AUTHENTICATION FORM */
            <form onSubmit={handleAuth} className="space-y-4">
              {/* Logo JIRA Visual */}
              <div className="flex justify-center mb-6">
                 <div className="w-12 h-12 bg-[#0052CC]/10 rounded-xl flex items-center justify-center border border-[#0052CC]/20">
                    <svg className="w-7 h-7 text-[#0052CC]" viewBox="0 0 24 24" fill="currentColor">
                       <path d="M11.53 2C11.53 2 11.33 2.01 11.23 2.02C8.75 2.15 6.47 3.32 4.88 5.21C3.33 7.04 2.34 9.38 2.11 11.96C2.11 11.96 2.1 12.16 2.1 12.26C2.1 17.63 6.47 22 11.83 22H21.9V11.93C21.9 6.44 17.26 2 11.53 2ZM13.06 12.44L14.28 15.69L11.03 16.91L9.81 13.66L13.06 12.44Z" />
                    </svg>
                 </div>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-200 text-center">
                  {error}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Site Domain</label>
                  <input 
                    type="text" 
                    placeholder="example.atlassian.net"
                    className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none transition-colors"
                    value={formData.domain}
                    onChange={e => setFormData({...formData, domain: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Email</label>
                  <input 
                    type="email" 
                    placeholder="user@company.com"
                    className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none transition-colors"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">API Token</label>
                  <input 
                    type="password" 
                    placeholder="••••••••••••••••"
                    className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none transition-colors"
                    value={formData.token}
                    onChange={e => setFormData({...formData, token: e.target.value})}
                    required
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full mt-4 bg-[#0052CC] hover:bg-[#0065ff] text-white font-medium py-2.5 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-lg shadow-blue-900/20"
              >
                {isLoading ? 'Connecting...' : 'Connect to JIRA'}
              </button>
            </form>
          ) : (
            /* STEP 2: PROJECT SELECTION */
            <div className="space-y-4">
              <p className="text-sm text-gray-400 text-center mb-4">
                Pilih proyek tujuan untuk menyimpan Gherkin scenarios.
              </p>
              
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
                {projects.map((proj) => (
                  <button
                    key={proj.id}
                    onClick={() => handleSelectProject(proj)}
                    disabled={isLoading}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-blue-500/30 transition-all group text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-xs font-bold text-white shadow-lg">
                        {proj.key.substring(0, 2)}
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-white group-hover:text-blue-300 transition-colors">{proj.name}</h4>
                        <p className="text-[10px] text-gray-500">{proj.key} • Software Project</p>
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-gray-600 group-hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JiraConnectModal;