import React, { useState, useEffect } from 'react';
import { useJira } from '../../contexts/JiraContext';

const JiraSetupReminder = ({ onSetupJira }) => {
  const { hasConnection, openJiraSetupModal } = useJira();
  const [showReminder, setShowReminder] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Show reminder if user doesn't have JIRA connection and hasn't dismissed it
    const reminderDismissed = localStorage.getItem('jira_reminder_dismissed');
    const reminderLastShown = localStorage.getItem('jira_reminder_last_shown');
    const now = Date.now();
    
    // Don't show reminder more than once per day
    if (reminderLastShown && now - parseInt(reminderLastShown) < 24 * 60 * 60 * 1000) {
      return;
    }
    
    if (!hasConnection && !reminderDismissed && !dismissed) {
      // Show reminder after 30 seconds on dashboard
      const timer = setTimeout(() => {
        setShowReminder(true);
        localStorage.setItem('jira_reminder_last_shown', now.toString());
      }, 30000);

      return () => clearTimeout(timer);
    }
  }, [hasConnection, dismissed]);

  const handleSetupNow = () => {
    setShowReminder(false);
    if (onSetupJira) {
      onSetupJira();
    } else {
      openJiraSetupModal();
    }
  };

  const handleDismiss = () => {
    setShowReminder(false);
    setDismissed(true);
    localStorage.setItem('jira_reminder_dismissed', 'true');
  };

  const handleRemindLater = () => {
    setShowReminder(false);
    // Set reminder to show again in 4 hours
    const fourHoursFromNow = Date.now() + (4 * 60 * 60 * 1000);
    localStorage.setItem('jira_reminder_last_shown', fourHoursFromNow.toString());
  };

  if (!showReminder || hasConnection) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-500">
      <div className="bg-gradient-to-r from-blue-600/90 to-purple-600/90 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl shadow-blue-500/20">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="text-white font-medium text-sm mb-1">
              Hubungkan JIRA untuk Workflow yang Lebih Baik
            </h4>
            <p className="text-white/80 text-xs mb-3">
              Buat user story dan subtask secara otomatis dari skenario Gherkin Anda.
            </p>
            
            <div className="flex gap-2">
              <button
                onClick={handleSetupNow}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded-lg transition-colors"
              >
                Setup Sekarang
              </button>
              <button
                onClick={handleRemindLater}
                className="px-3 py-1.5 text-white/70 hover:text-white text-xs transition-colors"
              >
                Ingatkan Nanti
              </button>
            </div>
          </div>
          
          <button
            onClick={handleDismiss}
            className="text-white/60 hover:text-white transition-colors flex-shrink-0"
            title="Jangan tampilkan lagi"
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