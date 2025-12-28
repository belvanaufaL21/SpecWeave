import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import ChatHistory from '../components/dashboard/ChatHistory';
import ProfileSection from '../components/dashboard/ProfileSection';
import StatisticsChart from '../components/dashboard/StatisticsChart';
import TeamSection from '../components/dashboard/TeamSection';
import ContinueLearning from '../components/dashboard/ContinueLearning';
import JiraSetupModal from '../components/modals/JiraSetupModal';
import JiraSetupReminder from '../components/common/JiraSetupReminder';
import OnboardingTips from '../components/common/OnboardingTips';
import ProfileDropdown from '../components/common/ProfileDropdown';
import UserGuideModal from '../components/modals/UserGuideModal';
import SidebarProfileDropdown from '../components/common/SidebarProfileDropdown';
import JiraStatusIndicator from '../components/common/JiraStatusIndicator';
import Logo from '../components/common/Logo';
import TemplateModal from '../components/modals/TemplateModal';
import EpicSelectionModal from '../components/modals/EpicSelectionModal';
import ReferenceLibraryManager from '../components/common/ReferenceLibraryManager';

import { scenarioService } from '../services/scenarioService';
import { useJiraSetup } from '../hooks/useJiraSetup';
import { useJira } from '../contexts/JiraContext';
import { jiraService } from '../services/jiraService';

const Dashboard = () => {
  const { user, profile, signOut, isNewUser } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalScenarios: 0,
    scenariosLast30Days: 0,
    avgMeteorScore: null,
    avgGenerationTime: null,
    highQualityScenarios: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Modal states
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isKnowledgeBaseOpen, setIsKnowledgeBaseOpen] = useState(false);
  const [isUserGuideModalOpen, setIsUserGuideModalOpen] = useState(false);

  // JIRA Context
  const { 
    isEpicModalOpen, 
    setEpicContext: setEpicContextGlobal,
    openEpicModal,
    closeEpicModal,
    openJiraSetupModal,
    connections
  } = useJira();
  
  // JIRA Setup Hook
  const {
    hasJiraConnection,
    showSetupModal,
    handleSetupComplete,
    handleSetupSkip,
    openSetupModal
  } = useJiraSetup();

  // Sidebar state
  const [isHovered, setIsHovered] = useState(false); 
  const [isPinned, setIsPinned] = useState(false);   
  const [ignoreHover, setIgnoreHover] = useState(false); 

  const isSidebarVisible = isPinned || (isHovered && !ignoreHover);

  // Memoize selected project key to avoid repeated computation
  const selectedProjectKey = useMemo(() => {
    // Get active project for current chat
    try {
      const chatId = 'dashboard-enhanced-default'; // Dashboard Enhanced uses a default chat context
      const activeProjects = JSON.parse(localStorage.getItem('activeProjectsPerChat') || '{}');
      const activeProjectId = activeProjects[chatId];
      
      if (activeProjectId && connections) {
        const activeProject = connections.find(conn => conn?.id === activeProjectId);
        if (activeProject) {
          return activeProject?.project_key || null;
        }
      }
      
      // Auto-set first connection as active if no active project is set
      if (!activeProjectId && connections && connections.length > 0) {
        const firstConnection = connections[0];
        
        // Set as active project
        jiraService.setActiveProjectForChat(chatId, firstConnection.id);
        
        return firstConnection.project_key;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }, [connections]); // Dependencies: only recalculate when connections change

  // Handlers
  const handleSignOut = async () => {
    try {
      const result = await signOut();
      navigate('/', { replace: true });
    } catch (error) {
      navigate('/', { replace: true });
    }
  };

  const handleStartChat = () => {
    navigate('/chat');
  };

  const handleEpicSelected = async (epicData) => {
    await setEpicContextGlobal(epicData);
  };

  const handleJiraSetup = () => {
    openJiraSetupModal();
  };

  const handleOpenTemplates = () => {
    setIsTemplateModalOpen(true);
  };

  const handleCloseTemplates = () => {
    setIsTemplateModalOpen(false);
  };

  const handleSelectTemplate = (template) => {
    navigate('/chat', { state: { initialMessage: template } });
  };

  const handleOpenKnowledgeBase = () => {
    setIsKnowledgeBaseOpen(true);
  };

  const handleCloseKnowledgeBase = () => {
    setIsKnowledgeBaseOpen(false);
  };

  const handleOpenUserGuide = () => {
    setIsUserGuideModalOpen(true);
  };

  const handleCloseUserGuide = () => {
    setIsUserGuideModalOpen(false);
  };

  const handleSelectReference = (reference) => {
    navigate('/chat', { state: { 
      initialMessage: `Please help me create a Gherkin scenario based on this reference:\n\n${reference.gherkinContent}`,
      referenceContext: reference 
    } });
  };

  const handleToggleSidebar = () => {
    if (isPinned) {
        setIsPinned(false);
        setIsHovered(false); 
        setIgnoreHover(true);
        setTimeout(() => setIgnoreHover(false), 600); 
    } else {
        setIsPinned(true);
    }
  };

  const handleTriggerEnter = () => {
      if (!isPinned && !ignoreHover) {
          setIsHovered(true);
      }
  };

  // Load user statistics
  useEffect(() => {
    const loadStats = async () => {
      if (!user) return;
      
      try {
        setLoadingStats(true);
        const result = await scenarioService.getUserStats();
        
        if (result.success) {
          setStats({
            totalScenarios: result.data.total_scenarios || 0,
            scenariosLast30Days: result.data.scenarios_last_30_days || 0,
            avgMeteorScore: result.data.avg_meteor_score,
            avgGenerationTime: result.data.avg_generation_time_ms,
            highQualityScenarios: result.data.high_quality_scenarios || 0
          });
        }
      } catch (error) {
        // Error loading stats
      } finally {
        setLoadingStats(false);
      }
    };

    loadStats();
  }, [user]);

  return (
    <div className="min-h-screen bg-[#020203] text-white font-sans flex overflow-hidden relative">
      
      {/* GLOBAL BACKGROUND */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vh] bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.08)_0%,rgba(0,0,0,0)_70%)] blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vh] bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.08)_0%,rgba(0,0,0,0)_70%)] blur-[100px]" />
      </div>

      {/* TRIGGER ZONE */}
      {!isPinned && (
        <div 
            onMouseEnter={handleTriggerEnter}
            className="fixed top-0 left-0 w-5 h-full z-50 bg-transparent" 
        />
      )}

      {/* SIDEBAR */}
      <aside 
        onMouseLeave={() => !isPinned && setIsHovered(false)}
        className={`
            fixed top-0 left-0 h-full z-40 flex flex-col
            bg-[#0a0a0f]/95 backdrop-blur-3xl border-r border-white/5 shadow-[10px_0_40px_rgba(0,0,0,0.5)]
            transition-transform duration-300 cubic-bezier(0.2, 0, 0, 1)
            ${isSidebarVisible ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{ width: '280px' }}
      >
        <div className="p-5 flex flex-col h-full w-full">
            
            <div className="flex items-center justify-between mb-8 pl-1">
                <a href="/" className="group">
                    <Logo size="md" showText={true} />
                </a>
                <button 
                    onClick={handleToggleSidebar}
                    className={`p-2 rounded-lg transition-all duration-300 group/pin border ${isPinned ? 'bg-white/10 text-white border-white/10 shadow-sm' : 'bg-transparent text-gray-500 border-transparent hover:bg-white/5 hover:text-gray-300'}`}
                    title={isPinned ? "Unpin Sidebar" : "Pin Sidebar"}
                >
                    {isPinned ? (
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
                    ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                    )}
                </button>
            </div>

            {/* Navigation Section */}
            <div className="space-y-1 mb-6">
                <div className="w-full flex items-center gap-3 px-4 py-3 text-white bg-white/10 rounded-xl">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  </svg>
                  <span className="text-sm font-medium">Dashboard</span>
                </div>

                <button
                  onClick={handleStartChat}
                  className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-200 group"
                >
                  <svg className="w-4 h-4 opacity-70 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <span className="text-sm font-medium">New Chat</span>
                </button>

                <button
                  onClick={handleOpenTemplates}
                  className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-200 group"
                >
                  <svg className="w-4 h-4 opacity-70 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm font-medium">Templates</span>
                </button>

                <div className="w-full flex items-center gap-3 px-4 py-3">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <div className="flex-1">
                    <JiraStatusIndicator 
                      onSetupJira={handleJiraSetup}
                      compact={true}
                    />
                  </div>
                </div>
            </div>

            <div className="pt-4 mt-2 border-t border-white/5 space-y-2">
                <SidebarProfileDropdown 
                  onSignOut={handleSignOut}
                  onOpenUserGuide={handleOpenUserGuide}
                />
            </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main 
        className={`
            flex-1 flex flex-col h-screen relative z-10 w-full min-w-0 
            transition-all duration-300 ease-in-out
            ${isPinned ? 'pl-[280px]' : 'pl-0'} 
        `}
      >
          {/* Header */}
        <header className="sticky top-0 z-30 border-b border-white/5 bg-[#020203]/80 backdrop-blur-2xl">
          <div className="px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                {!isPinned && (
                  <button 
                    onClick={handleToggleSidebar} 
                    className="text-gray-300 hover:text-white transition-colors p-2.5 rounded-xl hover:bg-white/10 bg-white/5 border border-white/10" 
                    title="Open Sidebar"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                    </svg>
                  </button>
                )}
                
                <div className="flex items-center gap-4">
                  <Logo size="lg" showText={false} />
                  <div>
                    <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-100 to-gray-300">SpecWeave</h1>
                    <p className="text-sm text-gray-400 font-medium">Dashboard</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <ProfileDropdown 
                  onSignOut={handleSignOut} 
                  onOpenUserGuide={handleOpenUserGuide}
                />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-7xl mx-auto">
            {/* Enhanced Welcome Section */}
            <motion.div 
              className="relative overflow-hidden bg-gradient-to-br from-purple-600/20 via-purple-500/15 to-pink-600/20 backdrop-blur-xl border border-purple-500/30 rounded-3xl mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              {/* Animated background elements */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-3xl transform translate-x-32 -translate-y-32"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-blue-400/10 to-purple-400/10 rounded-full blur-3xl transform -translate-x-24 translate-y-24"></div>
              </div>
              
              <div className="relative z-10 p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-xl shadow-purple-500/25">
                      <Logo size="md" showText={false} />
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold text-white mb-2">
                        Sharpen Your Skills with
                      </h1>
                      <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-pink-200">
                        Professional Gherkin Scenarios
                      </h2>
                    </div>
                  </div>
                  <motion.button
                    onClick={handleStartChat}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-2xl shadow-lg shadow-purple-500/25 transition-all duration-300"
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <div className="flex items-center gap-2">
                      <span>Start Now</span>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                  </motion.button>
                </div>
              </div>
            </motion.div>

            {/* Main Grid Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
              {/* Left Column - Main Content (3 columns) */}
              <div className="xl:col-span-3 space-y-8">
                {/* Continue Learning Section */}
                <ContinueLearning 
                  onStartChat={handleStartChat}
                  onOpenTemplates={handleOpenTemplates}
                  onOpenKnowledgeBase={handleOpenKnowledgeBase}
                />

                {/* Chat History with enhanced design */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-2xl p-6"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">Your Lessons</h2>
                    <button className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
                      See all
                    </button>
                  </div>
                  <ChatHistory />
                </motion.div>
              </div>

              {/* Right Column - Sidebar (1 column) */}
              <div className="xl:col-span-1 space-y-6">
                {/* Statistics Chart */}
                <StatisticsChart stats={stats} loadingStats={loadingStats} />
                
                {/* Team Section */}
                <TeamSection />
                
                {/* Profile Section */}
                <div className="sticky top-24">
                  <ProfileSection />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* JIRA Setup Modal */}
      <JiraSetupModal
        isOpen={showSetupModal}
        onClose={handleSetupSkip}
        onSkip={handleSetupSkip}
        onComplete={handleSetupComplete}
      />

      {/* JIRA Setup Reminder */}
      <JiraSetupReminder />

      {/* Onboarding Tips */}
      <OnboardingTips />

      {/* Epic Selection Modal */}
      <EpicSelectionModal 
        isOpen={isEpicModalOpen} 
        onClose={closeEpicModal}
        onEpicSelected={handleEpicSelected}
        selectedProjectKey={selectedProjectKey}
      />

      {/* Template Modal */}
      <TemplateModal
        isOpen={isTemplateModalOpen}
        onClose={handleCloseTemplates}
        onSelectTemplate={handleSelectTemplate}
      />

      {/* Knowledge Base Modal */}
      <ReferenceLibraryManager
        isOpen={isKnowledgeBaseOpen}
        onClose={handleCloseKnowledgeBase}
        onSelectReference={handleSelectReference}
      />

      {/* User Guide Modal */}
      <UserGuideModal
        isOpen={isUserGuideModalOpen}
        onClose={handleCloseUserGuide}
      />

    </div>
  );
};

export default Dashboard;