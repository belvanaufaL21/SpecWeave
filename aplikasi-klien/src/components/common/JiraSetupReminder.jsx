import React, { useState, useEffect } from 'react';
import { useJiraSetup } from '../../hooks/useJiraSetup';

const JiraSetupReminder = () => {
  const { hasJiraConnection, openSetupModal } = useJiraSetup();
  const [showReminder, setShowReminder] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Show reminder if user doesn't have JIRA connection and hasn't dismissed it
    const reminderDismissed = localStorage.getItem('jira_reminder_dismissed');
    
    if (!hasJiraConnection && !reminderDismissed && !dismissed) {
      // Show reminder after 30 seconds on dashboard
      const timer = setTimeout(() => {
        setShowReminder(true);
      }, 30000);

      return () => clearTimeout(timer);
    }
  }, [hasJiraConnection, dismissed]);

  const handleSetupNow = () => {
    setShowReminder(false);
    openSetupModal();
  };

  const handleDismiss = () => {
    setShowReminder(false);
    setDismissed(true);
    localStorage.setItem('jira_reminder_dismissed', 'true');
  };

  if (!showReminder || hasJiraConnection) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 max-w-sm">
      <div className="bg-gradient-to-r from-blue-600/90 to-purple-600/90 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl shadow-blue-500/20">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="text-white font-medium text-sm mb-1">
              Connect JIRA for Better Workflow
            </h4>
            <p className="text-white/80 text-xs mb-3">
              Automatically create user stories and subtasks from your Gherkin scenarios.
            </p>
            
            <div className="flex gap-2">
              <button
                onClick={handleSetupNow}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded-lg transition-colors"
              >
                Setup Now
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 text-white/70 hover:text-white text-xs transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </div>
          
          <button
            onClick={handleDismiss}
            className="text-white/60 hover:text-white transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default JiraSetupReminder;