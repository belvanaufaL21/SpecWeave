import React from 'react';
import { useTestResults } from '../../contexts/TestResultsContext';
import cleanLogger from '../../config/cleanLogging.js';

const TestButton = ({ 
  scenarioId, 
  scenarioText,
  scenarioTitle, // Add scenarioTitle prop
  scenarioIndex,
  messageId,
  activeChatId,
  onTestClick,
  className = '',
  size = 'md'
}) => {
  const { isScenarioTested, getTestResult, getAllTestResults } = useTestResults();
  const [forceUpdate, setForceUpdate] = React.useState(0);
  
  // Listen for test completion events to force re-render
  React.useEffect(() => {
    const handleTestCompleted = (event) => {
      // Check if this is the scenario that was tested
      if (event.detail?.messageId === messageId && event.detail?.scenarioIndex === scenarioIndex) {
        console.log('🔄 [TEST-BUTTON] Test completed event received, forcing update');
        setForceUpdate(prev => prev + 1);
      }
    };
    
    const handleTestResultsUpdated = () => {
      console.log('🔄 [TEST-BUTTON] Test results updated event received, forcing update');
      setForceUpdate(prev => prev + 1);
    };
    
    window.addEventListener('meteorTestCompleted', handleTestCompleted);
    window.addEventListener('testResultsUpdated', handleTestResultsUpdated);
    
    return () => {
      window.removeEventListener('meteorTestCompleted', handleTestCompleted);
      window.removeEventListener('testResultsUpdated', handleTestResultsUpdated);
    };
  }, [messageId, scenarioIndex]);
  
  // Determine test status (will re-evaluate when forceUpdate changes)
  const isTested = isScenarioTested(messageId, scenarioIndex);
  const testResult = getTestResult(messageId, scenarioIndex);
  
  console.log('🔍 [TEST-BUTTON] Render state:', {
    messageId,
    scenarioIndex,
    isTested,
    hasTestResult: !!testResult,
    forceUpdate
  });
  
  // Get test count for this scenario
  const allTestResults = getAllTestResults();
  const scenarioTestCount = Object.values(allTestResults).filter(result => 
    result.messageId === messageId && result.scenarioIndex === scenarioIndex
  ).length;
  
  // Size variants
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-xs',
    lg: 'px-6 py-3 text-sm'
  };
  
  const handleClick = (e) => {
    console.log('🔍 [TEST-BUTTON] Button clicked:', {
      scenarioIndex,
      isTested,
      messageId
    });
    
    if (isTested) {
      // For link navigation, prevent default and let the browser handle it
      // This allows right-click to work properly
      return;
    } else {
      // Prevent navigation for test modal
      e.preventDefault();
      
      // Open test modal - call the provided callback or global function
      if (onTestClick) {
        cleanLogger.debug('TEST_BUTTON', 'Calling onTestClick callback');
        onTestClick(scenarioText, scenarioIndex, activeChatId, messageId, scenarioTitle);
      } else if (window.openMeteorTestModal) {
        cleanLogger.debug('TEST_BUTTON', 'Calling window.openMeteorTestModal');
        window.openMeteorTestModal(scenarioText, scenarioIndex, activeChatId, messageId, scenarioTitle);
      } else {
        cleanLogger.error('TEST_BUTTON', 'No test modal function available!');
      }
    }
  };

  // Construct URL for tested scenarios
  const fullScenarioId = scenarioId || `${messageId}-${scenarioIndex}`;
  const testResultUrl = `/test-results/${fullScenarioId}`;

  return (
    <a
      href={isTested ? testResultUrl : '#'}
      onClick={handleClick}
      className={`group/btn relative flex items-center gap-2 border rounded-xl font-semibold transition-all duration-300 overflow-hidden hover:scale-105 hover:shadow-xl ${sizeClasses[size]} ${className}`}
      style={{ 
        backgroundColor: '#160D14', 
        borderColor: '#44273D',
        color: '#FF7AD0',
        textDecoration: 'none'
      }}
      title={isTested ? "View Sentence-BERT Results" : "Test with Sentence-BERT"}
    >
      {/* Button Background Animation */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700"></div>
      
      {/* Button Content */}
      <div className="relative z-10 flex items-center gap-2">
        {isTested ? (
          <>
            <span>View</span>
            {scenarioTestCount > 1 && (
              <span className="text-xs opacity-75">({scenarioTestCount})</span>
            )}
          </>
        ) : (
          <>
            <span>Test</span>
          </>
        )}
      </div>
    </a>
  );
};

export default TestButton;