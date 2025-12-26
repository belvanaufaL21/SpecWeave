import { useState, useEffect } from 'react';
import { jiraService } from '../../services/jiraService';

const ProjectSwitcher = ({ currentProject, onProjectChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const result = await jiraService.getConnections();
      
      if (result.success && result.data.length > 0) {
        // Get projects from first connection (for now)
        const connection = result.data[0];
        const projectsResult = await jiraService.getProjectEpics(connection.id, connection.project_key);
        
        if (projectsResult.success) {
          // Mock multiple projects for demo
          const mockProjects = [
            {
              key: connection.project_key,
              name: `${connection.project_key} Project`,
              description: 'Primary project',
              type: 'software',
              lead: 'Project Lead'
            },
            {
              key: 'WEB',
              name: 'Web Platform',
              description: 'Frontend and backend services',
              type: 'software', 
              lead: 'Web Team Lead'
            },
            {
              key: 'MOBILE',
              name: 'Mobile Apps',
              description: 'iOS and Android applications',
              type: 'software',
              lead: 'Mobile Team Lead'
            }
          ];
          setProjects(mockProjects);
        }
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSelect = (project) => {
    onProjectChange(project);
    setIsOpen(false);
  };

  if (!currentProject || projects.length <= 1) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
          {currentProject.key.substring(0, 2)}
        </div>
        <div className="text-left">
          <p className="text-white text-sm font-medium">{currentProject.name}</p>
          <p className="text-gray-400 text-xs">{currentProject.key}</p>
        </div>
        <svg 
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-2 w-80 bg-[#16161e] border border-white/10 rounded-xl shadow-2xl z-50">
            <div className="p-3 border-b border-white/10">
              <p className="text-white text-sm font-medium">Switch Project</p>
              <p className="text-gray-400 text-xs">Select a project to work with</p>
            </div>
            
            <div className="max-h-64 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center">
                  <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-gray-400 text-sm">Loading projects...</p>
                </div>
              ) : (
                <div className="p-2">
                  {projects.map((project) => (
                    <button
                      key={project.key}
                      onClick={() => handleProjectSelect(project)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-all text-left ${
                        currentProject.key === project.key ? 'bg-blue-500/10 border border-blue-500/20' : ''
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                        {project.key.substring(0, 2)}
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">{project.name}</p>
                        <p className="text-gray-400 text-xs">{project.key} • {project.description}</p>
                        {project.lead && (
                          <p className="text-gray-500 text-xs mt-1">Lead: {project.lead}</p>
                        )}
                      </div>
                      {currentProject.key === project.key && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-3 border-t border-white/10">
              <p className="text-gray-500 text-xs text-center">
                Need access to more projects? Contact your JIRA admin.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProjectSwitcher;