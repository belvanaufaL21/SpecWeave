import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useJira } from '../../contexts/JiraContext';
import { BUTTON_LABELS, STATUS_MESSAGES, TOOLTIPS } from '../../utils/localization';

const ChatActionButtons = ({ 
  onNewChat, 
  onExport, 
  onTestWithMeteor, 
  onOpenTemplates,
  onOpenJiraEpic,
  hasMessages = false,
  disabled = false 
}) => {
  const [buttonStates, setButtonStates] = useState({
    newChat: 'idle', // idle, loading, success
    export: 'idle',
    meteor: 'idle',
    templates: 'idle',
    jiraEpic: 'idle'
  });

  const { hasConnection, epicContext } = useJira();

  // Update button state with animation
  const updateButtonState = (buttonName, state) => {
    setButtonStates(prev => ({ ...prev, [buttonName]: state }));
    
    if (state === 'success') {
      setTimeout(() => {
        setButtonStates(prev => ({ ...prev, [buttonName]: 'idle' }));
      }, 2000);
    }
  };

  // Handle button actions with state management
  const handleAction = async (action, buttonName) => {
    if (disabled || buttonStates[buttonName] === 'loading') return;
    
    updateButtonState(buttonName, 'loading');
    
    try {
      await action();
      updateButtonState(buttonName, 'success');
    } catch (error) {
      console.error(`Error in ${buttonName}:`, error);
      updateButtonState(buttonName, 'idle');
    }
  };

  // Button component with enhanced states
  const ActionButton = ({ 
    onClick, 
    icon, 
    label, 
    buttonKey, 
    variant = 'default',
    disabled: buttonDisabled = false,
    tooltip,
    badge = null
  }) => {
    const state = buttonStates[buttonKey];
    const isButtonDisabled = disabled || buttonDisabled || state === 'loading';
    
    const getButtonStyles = () => {
      const baseStyles = "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 relative overflow-hidden backdrop-blur-sm";
      
      switch (variant) {
        case 'primary':
          return `${baseStyles} ${
            state === 'success' 
              ? 'bg-green-500/15 border-green-400/40 text-green-300 shadow-lg shadow-green-500/10' 
              : state === 'loading'
                ? 'bg-purple-500/15 border-purple-400/40 text-purple-300 shadow-lg shadow-purple-500/10'
                : 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border-purple-400/30 hover:border-purple-400/50 text-purple-200 hover:text-white shadow-lg shadow-purple-500/15 hover:shadow-purple-500/25'
          } border`;
        case 'secondary':
          return `${baseStyles} ${
            state === 'success' 
              ? 'bg-green-500/10 text-green-300 shadow-lg shadow-green-500/5' 
              : state === 'loading'
                ? 'bg-purple-500/10 text-purple-300 shadow-lg shadow-purple-500/5'
                : 'bg-[#0a0a0f]/60 hover:bg-[#0a0a0f]/80 border border-white/10 hover:border-purple-400/30 text-gray-300 hover:text-white shadow-lg hover:shadow-purple-500/10'
          }`;
        case 'danger':
          return `${baseStyles} ${
            state === 'success' 
              ? 'bg-green-500/15 border-green-400/40 text-green-300 shadow-lg shadow-green-500/10' 
              : state === 'loading'
                ? 'bg-red-500/15 border-red-400/40 text-red-300 shadow-lg shadow-red-500/10'
                : 'bg-red-500/20 hover:bg-red-500/30 border-red-400/30 hover:border-red-400/50 text-red-300 hover:text-red-200 shadow-lg shadow-red-500/15'
          } border`;
        default:
          return `${baseStyles} ${
            state === 'success' 
              ? 'bg-green-500/10 text-green-300 shadow-lg shadow-green-500/5' 
              : state === 'loading'
                ? 'bg-purple-500/10 text-purple-300 shadow-lg shadow-purple-500/5'
                : 'bg-[#0a0a0f]/60 hover:bg-[#0a0a0f]/80 border border-white/10 hover:border-purple-400/30 text-gray-300 hover:text-white shadow-lg hover:shadow-purple-500/10'
          }`;
      }
    };

    const getIcon = () => {
      if (state === 'loading') {
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
          />
        );
      }
      
      if (state === 'success') {
        return (
          <motion.svg
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </motion.svg>
        );
      }
      
      return icon;
    };

    const getLabel = () => {
      if (state === 'loading') return STATUS_MESSAGES.LOADING;
      if (state === 'success') return STATUS_MESSAGES.SUCCESS;
      return label;
    };

    return (
      <motion.button
        onClick={() => handleAction(onClick, buttonKey)}
        disabled={isButtonDisabled}
        className={`${getButtonStyles()} ${isButtonDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={tooltip}
        whileHover={!isButtonDisabled ? { scale: 1.02, y: -1 } : {}}
        whileTap={!isButtonDisabled ? { scale: 0.98 } : {}}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Background animation for loading state */}
        <AnimatePresence>
          {state === 'loading' && (
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              exit={{ x: '100%' }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            />
          )}
        </AnimatePresence>

        <div className="relative z-10 flex items-center gap-2">
          {getIcon()}
          <span>{getLabel()}</span>
          {badge && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-2 h-2 bg-current rounded-full opacity-60"
            />
          )}
        </div>
      </motion.button>
    );
  };

  return (
    <motion.div 
      className="flex items-center gap-3 flex-wrap"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, staggerChildren: 0.1 }}
    >
      {/* New Chat Button */}
      <ActionButton
        onClick={onNewChat}
        buttonKey="newChat"
        variant="secondary"
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        }
        label={BUTTON_LABELS.NEW_CHAT}
        tooltip={TOOLTIPS.NEW_CHAT}
      />

      {/* Templates Button */}
      <ActionButton
        onClick={onOpenTemplates}
        buttonKey="templates"
        variant="default"
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
        label={BUTTON_LABELS.TEMPLATES}
        tooltip={TOOLTIPS.TEMPLATES}
      />

      {/* JIRA Epic Button - Conditional */}
      {hasConnection && (
        <ActionButton
          onClick={onOpenJiraEpic}
          buttonKey="jiraEpic"
          variant="default"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
          label={epicContext ? BUTTON_LABELS.CHANGE_EPIC : BUTTON_LABELS.SELECT_EPIC}
          tooltip={TOOLTIPS.SELECT_EPIC}
          badge={epicContext ? true : false}
        />
      )}

      {/* Action buttons for when there are messages */}
      {hasMessages && (
        <>
          {/* Test with Meteor Button */}
          <ActionButton
            onClick={onTestWithMeteor}
            buttonKey="meteor"
            variant="primary"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
              </svg>
            }
            label={BUTTON_LABELS.TEST_WITH_METEOR}
            tooltip={TOOLTIPS.TEST_WITH_METEOR}
          />

          {/* Export Button */}
          <ActionButton
            onClick={onExport}
            buttonKey="export"
            variant="default"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
            label={BUTTON_LABELS.EXPORT}
            tooltip={TOOLTIPS.EXPORT}
          />
        </>
      )}
    </motion.div>
  );
};

export default ChatActionButtons;