import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

// Lazy load non-critical components
import ChatHistory from '../components/dashboard/ChatHistory';
import RecentActivity from '../components/dashboard/RecentActivity';
import UserStats from '../components/dashboard/UserStats';

// Critical components loaded immediately
import JiraSetupModal from '../components/modals/JiraSetupModal';
import JiraSetupReminder from '../components/common/JiraSetupReminder';
import OnboardingTips from '../components/common/OnboardingTips';
import ProfileDropdown from '../components/common/ProfileDropdown';
import ProfileModal from '../components/modals/ProfileModal';
import UserGuideModal from '../components/modals/UserGuideModal';
import Logo from '../components/common/Logo';
import TemplateModal from '../components/modals/TemplateModal';
import EpicSelectionModal from '../components/modals/EpicSelectionModal';
import ReferenceLibraryManager from '../components/common/ReferenceLibraryManager';
import ErrorBoundary from '../components/common/ErrorBoundary';

import { scenarioService } from '../services/scenarioService';
import { useJiraSetup } from '../hooks/useJiraSetup';
import { useJira } from '../contexts/JiraContext';
import { jiraService } from '../services/jiraService';

const Dashboard = () => {
  const { user, signOut, isNewUser } = useAuth();
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
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isUserGuideModalOpen, setIsUserGuideModalOpen] = useState(false);

  // JIRA Context
  const { 
    isEpicModalOpen, 
    setEpicContext: setEpicContextGlobal,
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

  // Memoize selected project key to avoid repeated computation
  const selectedProjectKey = useMemo(() => {
    // Get active project for current chat
    try {
      const chatId = 'dashboard-default'; // Dashboard uses a default chat context
      const activeProjects = JSON.parse(localStorage.getItem('activeProjectsPerChat') || '{}');
      const activeProjectId = activeProjects[chatId];
      
      if (activeProjectId && connections) {
        const activeProject = connections.find(conn => conn?.id === activeProjectId);
        if (activeProject) {
          console.log(`🎯 [EPIC-MODAL-DASHBOARD] Active project found:`, {
            connectionId: activeProjectId,
            projectKey: activeProject?.project_key,
            projectName: activeProject?.custom_fields?.project_info?.name
          });
          return activeProject?.project_key || null;
        }
      }
      
      // Auto-set first connection as active if no active project is set
      if (!activeProjectId && connections && connections.length > 0) {
        const firstConnection = connections[0];
        console.log(`🔧 [EPIC-MODAL-DASHBOARD] Auto-setting first connection as active:`, {
          connectionId: firstConnection.id,
          projectKey: firstConnection.project_key,
          projectName: firstConnection.custom_fields?.project_info?.name
        });
        
        // Set as active project
        jiraService.setActiveProjectForChat(chatId, firstConnection.id);
        
        return firstConnection.project_key;
      }
      
      // Only log once when no active project is found and no connections available
      if (connections && connections.length === 0) {
        console.log(`⚠️ [EPIC-MODAL-DASHBOARD] No JIRA connections available for chat: ${chatId}`);
      }
      
      return null;
    } catch (error) {
      console.error('Error getting active project key:', error);
      return null;
    }
  }, [connections]); // Dependencies: only recalculate when connections change

  // Handlers
  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Dashboard: Sign out error:', error);
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

  const handleSelectReference = (reference) => {
    navigate('/chat', { state: { 
      initialMessage: `Please help me create a Gherkin scenario based on this reference:\n\n${reference.gherkinContent}`,
      referenceContext: reference 
    } });
  };

  const handleOpenProfile = () => {
    setIsProfileModalOpen(true);
  };

  const handleCloseProfile = () => {
    setIsProfileModalOpen(false);
  };

  const handleOpenUserGuide = () => {
    setIsUserGuideModalOpen(true);
  };

  const handleCloseUserGuide = () => {
    setIsUserGuideModalOpen(false);
  };

  // Cache for stats to avoid repeated API calls
  const [statsCache, setStatsCache] = useState(null);
  const [lastStatsLoad, setLastStatsLoad] = useState(0);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Optimized stats loading with caching
  const loadStats = useCallback(async (force = false) => {
    if (!user) return;
    
    const now = Date.now();
    const cacheValid = statsCache && (now - lastStatsLoad) < CACHE_DURATION;
    
    if (!force && cacheValid) {
      setStats(statsCache);
      setLoadingStats(false);
      return;
    }
    
    try {
      setLoadingStats(true);
      const result = await scenarioService.getUserStats();
      
      if (result.success) {
        const newStats = {
          totalScenarios: result.data.total_scenarios || 0,
          scenariosLast30Days: result.data.scenarios_last_30_days || 0,
          avgMeteorScore: result.data.avg_meteor_score,
          avgGenerationTime: result.data.avg_generation_time_ms,
          highQualityScenarios: result.data.high_quality_scenarios || 0
        };
        
        setStats(newStats);
        setStatsCache(newStats);
        setLastStatsLoad(now);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      // Use cached data if available on error
      if (statsCache) {
        setStats(statsCache);
      }
    } finally {
      setLoadingStats(false);
    }
  }, [user, statsCache, lastStatsLoad]);

  // Load user statistics with optimized caching
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <div className="min-h-screen bg-[#020203] text-white font-sans flex overflow-hidden relative">
      
      {/* GLOBAL BACKGROUND */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vh] bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.08)_0%,rgba(0,0,0,0)_70%)] blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vh] bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.08)_0%,rgba(0,0,0,0)_70%)] blur-[100px]" />
      </div>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-screen relative z-10 w-full min-w-0">
          {/* Header */}
        <header className="sticky top-0 z-30 border-b border-white/5 bg-[#020203]/80 backdrop-blur-2xl">
          <div className="px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Logo size="lg" showText={false} />
                <div>
                  <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-100 to-gray-300">SpecWeave</h1>
                  <p className="text-sm text-gray-400 font-medium">Dashboard</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <ErrorBoundary fallbackMessage="Profile dropdown temporarily unavailable">
                  <ProfileDropdown 
                    onSignOut={handleSignOut} 
                    onOpenProfile={handleOpenProfile}
                    onOpenUserGuide={handleOpenUserGuide}
                  />
                </ErrorBoundary>
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
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
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
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* Left Column - Main Content (2 columns) */}
              <div className="xl:col-span-2 space-y-8">
                {/* Three Main Actions - Knowledge Base, Templates, JIRA */}
                <motion.div 
                  className="grid grid-cols-1 md:grid-cols-3 gap-6"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                >
                  {/* Knowledge Base */}
                  <motion.div
                    onClick={handleOpenKnowledgeBase}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleOpenKnowledgeBase()}
                    className="group relative overflow-hidden bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-2xl p-6 cursor-pointer"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.15 }}
                    whileHover={{ scale: 1.02, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Background gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-cyan-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    {/* Bookmark icon */}
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    </div>

                    <div className="relative z-10">
                      {/* Icon and badge */}
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-2xl">📚</span>
                        <span className="text-xs font-medium text-blue-400 bg-blue-500/10 px-2 py-1 rounded-full">
                          KNOWLEDGE BASE
                        </span>
                      </div>

                      {/* Content */}
                      <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-100 transition-colors">
                        Knowledge Base
                      </h3>
                      <p className="text-sm text-white/60 mb-4 line-clamp-2">
                        Reference library to enhance LLM accuracy with curated Gherkin scenarios
                      </p>

                      {/* Action button */}
                      <motion.button
                        className="w-full py-2 px-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl text-sm text-white transition-all duration-200"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Browse References
                      </motion.button>
                    </div>
                  </motion.div>

                  {/* Templates */}
                  <motion.div
                    onClick={handleOpenTemplates}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleOpenTemplates()}
                    className="group relative overflow-hidden bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-2xl p-6 cursor-pointer"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    whileHover={{ scale: 1.02, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Background gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-green-600/10 to-emerald-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    {/* Bookmark icon */}
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    </div>

                    <div className="relative z-10">
                      {/* Icon and badge */}
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-2xl">🎯</span>
                        <span className="text-xs font-medium text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
                          TEMPLATES
                        </span>
                      </div>

                      {/* Content */}
                      <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-green-100 transition-colors">
                        Templates
                      </h3>
                      <p className="text-sm text-white/60 mb-4 line-clamp-2">
                        Pre-built scenario templates for faster development and consistent quality
                      </p>

                      {/* Action button */}
                      <motion.button
                        className="w-full py-2 px-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl text-sm text-white transition-all duration-200"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Explore Templates
                      </motion.button>
                    </div>
                  </motion.div>

                  {/* JIRA Integration */}
                  <motion.div
                    onClick={openSetupModal}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && openSetupModal()}
                    className="group relative overflow-hidden bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-2xl p-6 cursor-pointer"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.25 }}
                    whileHover={{ scale: 1.02, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Background gradient */}
                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                      hasJiraConnection 
                        ? 'bg-gradient-to-br from-amber-600/10 to-yellow-600/10' 
                        : 'bg-gradient-to-br from-orange-600/10 to-red-600/10'
                    }`}></div>
                    
                    {/* Bookmark icon */}
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    </div>

                    <div className="relative z-10">
                      {/* Icon and badge */}
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-2xl">🔗</span>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          hasJiraConnection 
                            ? 'text-amber-400 bg-amber-500/10' 
                            : 'text-orange-400 bg-orange-500/10'
                        }`}>
                          {hasJiraConnection ? 'CONNECTED' : 'INTEGRATION'}
                        </span>
                      </div>

                      {/* Content */}
                      <h3 className={`text-lg font-semibold text-white mb-2 transition-colors ${
                        hasJiraConnection ? 'group-hover:text-amber-100' : 'group-hover:text-orange-100'
                      }`}>
                        JIRA Integration
                      </h3>
                      <p className="text-sm text-white/60 mb-4 line-clamp-2">
                        {hasJiraConnection 
                          ? 'Auto-create tickets and sync with your JIRA projects'
                          : 'Connect with JIRA to streamline your workflow and project management'
                        }
                      </p>

                      {/* Action button */}
                      <motion.button
                        className="w-full py-2 px-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl text-sm text-white transition-all duration-200"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {hasJiraConnection ? 'Manage Connection' : 'Setup Integration'}
                      </motion.button>
                    </div>
                  </motion.div>
                </motion.div>

                {/* Chat History with enhanced design */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                  className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-2xl p-6"
                >
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-white">Chat History</h2>
                  </div>
                  <ChatHistory />
                </motion.div>
              </div>

              {/* Right Column - Recent Activity & Stats (1 column) */}
              <div className="xl:col-span-1 space-y-6">
                {/* Recent Activity */}
                <ErrorBoundary fallbackMessage="Recent activity temporarily unavailable">
                  <RecentActivity />
                </ErrorBoundary>
                
                {/* User Statistics */}
                <ErrorBoundary fallbackMessage="Statistics temporarily unavailable">
                  <UserStats stats={stats} loadingStats={loadingStats} />
                </ErrorBoundary>
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

      {/* Profile Modal */}
      <ErrorBoundary fallbackMessage="Profile modal temporarily unavailable">
        <ProfileModal
          isOpen={isProfileModalOpen}
          onClose={handleCloseProfile}
        />
      </ErrorBoundary>

      {/* User Guide Modal */}
      <ErrorBoundary fallbackMessage="User guide modal temporarily unavailable">
        <UserGuideModal
          isOpen={isUserGuideModalOpen}
          onClose={handleCloseUserGuide}
        />
      </ErrorBoundary>

    </div>
  );
};

export default Dashboard;