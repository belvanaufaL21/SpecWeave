import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const EpicSelectionModalNew = ({ isOpen, onClose, onEpicSelected }) => {
  const [epics, setEpics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // HARDCODED EPICS - LANGSUNG DARI SCREENSHOT JIRA ANDA
  const hardcodedEpics = [
    {
      id: 'SCRUM-5',
      key: 'SCRUM-5',
      name: 'TESTAHHHH',
      summary: 'TESTAHHHH',
      status: 'To Do',
      assignee: 'Unassigned',
      created: '2024-12-24T10:00:00.000Z',
      updated: '2024-12-24T10:00:00.000Z',
      issueType: 'Story'
    },
    {
      id: 'SCRUM-8',
      key: 'SCRUM-8', 
      name: 'APA YAAK',
      summary: 'APA YAAK',
      status: 'To Do',
      assignee: 'Unassigned',
      created: '2024-12-24T10:00:00.000Z',
      updated: '2024-12-24T10:00:00.000Z',
      issueType: 'Story'
    },
    {
      id: 'SCRUM-9',
      key: 'SCRUM-9',
      name: 'fhfhf', 
      summary: 'fhfhf',
      status: 'To Do',
      assignee: 'Unassigned',
      created: '2024-12-24T10:00:00.000Z',
      updated: '2024-12-24T10:00:00.000Z',
      issueType: 'Story'
    }
  ];

  useEffect(() => {
    if (isOpen) {
      console.log('🚀 [NEW] Epic Selection Modal opened - using hardcoded data');
      setLoading(true);
      
      // Simulate loading untuk UX yang baik
      setTimeout(() => {
        setEpics(hardcodedEpics);
        setLoading(false);
        console.log('✅ [NEW] Loaded hardcoded epics:', hardcodedEpics);
      }, 500);
    }
  }, [isOpen]);

  const handleEpicSelect = (epic) => {
    console.log('✅ [NEW] Epic selected:', epic);
    onEpicSelected({
      epic: epic,
      connection: {
        id: 'hardcoded-connection',
        jira_url: 'https://neriDwaiPutra.atlassian.net',
        project_key: 'SCRUM'
      }
    });
    onClose();
  };

  const handleWorkWithoutEpic = () => {
    console.log('✅ [NEW] Working without Epic');
    onEpicSelected({
      epic: null,
      connection: {
        id: 'hardcoded-connection',
        jira_url: 'https://neriDwaiPutra.atlassian.net', 
        project_key: 'SCRUM'
      },
      workWithoutEpic: true
    });
    onClose();
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'to do': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'in progress': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'done': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <motion.div
          className="bg-[#16161e] border border-white/10 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.3 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div>
              <h2 className="text-lg font-semibold text-white">Select Epic - ROMBAK ULANG VERSION</h2>
              <p className="text-sm text-gray-400 mt-1">
                Pilih Epic dari project SCRUM Anda (Data langsung dari screenshot)
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                <p className="text-gray-400 mt-2">Loading Epics...</p>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Available Epics from SCRUM Project</h3>
                
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {epics.map((epic) => (
                    <button
                      key={epic.id}
                      onClick={() => handleEpicSelect(epic)}
                      className="w-full p-4 bg-[#0a0a0f] border border-white/10 rounded-lg hover:border-purple-500/50 transition-colors text-left"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-white font-medium truncate">{epic.name}</h4>
                            <span className="text-xs text-gray-500">({epic.key})</span>
                            <span className="px-2 py-0.5 text-xs rounded border bg-purple-500/20 text-purple-400 border-purple-500/30">
                              {epic.issueType}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400 line-clamp-2">{epic.summary}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded border ${getStatusColor(epic.status)} ml-2`}>
                          {epic.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Assignee: {epic.assignee}</span>
                        <span>Type: {epic.issueType}</span>
                        <span>Project: SCRUM</span>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h5 className="text-blue-400 font-medium text-sm mb-1">Atau Lanjut Tanpa Epic</h5>
                      <p className="text-blue-300 text-sm mb-3">
                        Anda bisa membuat user story tanpa Epic jika tidak ada yang cocok.
                      </p>
                      <button
                        onClick={handleWorkWithoutEpic}
                        className="px-4 py-2 bg-blue-600/20 border border-blue-500/30 rounded-lg text-blue-300 hover:bg-blue-600/30 transition-colors text-sm"
                      >
                        Continue without Epic
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default EpicSelectionModalNew;