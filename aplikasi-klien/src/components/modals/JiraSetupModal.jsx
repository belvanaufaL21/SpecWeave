import { useState } from 'react';
import { jiraService } from '../../services/jiraService';
import { useJira } from '../../contexts/JiraContext';

const JiraSetupModal = ({ isOpen, onClose, onSkip, onComplete }) => {
  const { refreshConnections } = useJira();
  const [step, setStep] = useState(1); // 1: Welcome, 2: Setup Form, 3: Success
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    jiraUrl: '',
    email: '',
    apiToken: '',
    projectKey: '',
    issueType: 'Story'
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleOAuthConnect = async () => {
    setLoading(true);
    setError('');

    try {
      // Try to start OAuth flow directly
      const result = await jiraService.startOAuthFlow({});
      
      if (result.success) {
        // OAuth worked, redirect to authorization
        window.location.href = result.data.authUrl;
      } else {
        // OAuth failed, check the error code
        if (result.code === 'OAUTH_NOT_AVAILABLE') {
          // OAuth is not implemented yet, show helpful message
          setError('OAuth login is not yet available. Redirecting to manual setup...');
          setTimeout(() => {
            setError('');
            setStep(3); // Redirect to manual setup
          }, 2000);
        } else {
          // Other OAuth error
          setError(result.error || 'OAuth connection failed. Please try manual setup.');
          setTimeout(() => {
            setError('');
            setStep(3); // Redirect to manual setup after error
          }, 3000);
        }
      }
    } catch (err) {
      console.error('OAuth connection error:', err);
      
      // Handle network or other errors
      setError('OAuth connection failed. Redirecting to manual setup...');
      setTimeout(() => {
        setError('');
        setStep(3); // Redirect to manual setup
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.jiraUrl || !formData.email || !formData.apiToken || !formData.projectKey) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('Testing JIRA connection...', {
        jiraUrl: formData.jiraUrl,
        email: formData.email,
        projectKey: formData.projectKey,
        apiToken: formData.apiToken ? '[HIDDEN]' : 'MISSING'
      });

      // Test connection first
      const testResult = await jiraService.testConnection({
        jiraUrl: formData.jiraUrl,
        email: formData.email,
        apiToken: formData.apiToken,
        projectKey: formData.projectKey
      });

      console.log('Test result:', testResult);

      if (!testResult.success) {
        setError(testResult.error || 'Failed to connect to JIRA. Please check your credentials.');
        return;
      }

      // Create connection if test successful
      const result = await jiraService.createConnection({
        jiraUrl: formData.jiraUrl,
        email: formData.email,
        apiToken: formData.apiToken,
        projectKey: formData.projectKey,
        issueType: formData.issueType
      });
      
      console.log('Create connection result:', result);
      
      if (result.success) {
        setStep(4); // Success step
        
        // Refresh connections in context
        await refreshConnections();
        
        setTimeout(() => {
          onComplete();
        }, 2000);
      } else {
        setError(result.error || 'Failed to create JIRA connection');
      }
    } catch (err) {
      console.error('Connection error:', err);
      setError(err.message || 'An error occurred while connecting to JIRA');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  const handleSetupLater = () => {
    onSkip();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-[#16161e] border border-white/10 rounded-xl max-w-2xl w-full mx-auto max-h-[80vh] overflow-y-auto shadow-2xl transform transition-all duration-200 animate-in fade-in zoom-in-95">
        
        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="p-8 relative">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Welcome to SpecWeave!</h2>
              <p className="text-gray-400">
                Connect your JIRA account to automatically create user stories and subtasks from your Gherkin scenarios.
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-white text-sm font-medium">Automatic User Stories</p>
                  <p className="text-gray-500 text-xs">Create JIRA issues from scenarios</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <p className="text-white text-sm font-medium">Epic Organization</p>
                  <p className="text-gray-500 text-xs">Link stories to your Epics</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white text-sm font-medium">Subtask Generation</p>
                  <p className="text-gray-500 text-xs">Break down scenarios into tasks</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <p className="text-white text-sm font-medium">Multi-Project Support</p>
                  <p className="text-gray-500 text-xs">Access multiple JIRA projects</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-yellow-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-yellow-300 text-xs font-medium mb-1">Admin Setup Required</p>
                    <p className="text-yellow-200/80 text-xs">
                      JIRA admin needs to create OAuth app first. 
                      <a href="/JIRA_SETUP_GUIDE.md" target="_blank" className="text-yellow-300 underline ml-1">
                        View setup guide
                      </a>
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <div>
                    <p className="text-blue-300 text-xs font-medium mb-1">User Access Required</p>
                    <p className="text-blue-200/80 text-xs">
                      You need JIRA project access & permissions to create issues. 
                      <a href="/JIRA_USER_ACCESS_GUIDE.md" target="_blank" className="text-blue-300 underline ml-1">
                        Check requirements
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-blue-500/20"
              >
                Setup JIRA Now
              </button>
              <button
                onClick={handleSetupLater}
                className="px-4 py-3 text-gray-400 hover:text-white transition-colors"
              >
                Cancel Setup
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Connection Options */}
        {step === 2 && (
          <div className="p-8 relative">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Connect to JIRA</h2>
              <p className="text-gray-400">
                Choose how you'd like to connect your JIRA account
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <p className="text-red-400 text-sm font-medium">Connection Failed</p>
                    <p className="text-red-300/80 text-sm mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4 mb-8">
              {/* OAuth Option (Recommended) */}
              <button
                onClick={handleOAuthConnect}
                disabled={loading}
                className="w-full p-6 bg-gradient-to-r from-green-600/20 to-blue-600/20 border border-green-500/30 rounded-xl text-left hover:from-green-600/30 hover:to-blue-600/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    {loading ? (
                      <div className="w-6 h-6 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-white">OAuth Login</h3>
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded">Recommended</span>
                    </div>
                    <p className="text-gray-400 text-sm mb-3">
                      {loading ? 'Connecting to JIRA...' : 'Secure one-click login with your JIRA account'}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Auto-detect projects
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Secure OAuth 2.0
                      </span>
                    </div>
                  </div>
                </div>
              </button>

              {/* Manual Setup Option */}
              <button
                onClick={() => setStep(3)}
                disabled={loading}
                className="w-full p-6 bg-white/5 border border-white/10 rounded-xl text-left hover:bg-white/10 transition-all duration-200 disabled:opacity-50"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">Manual Setup</h3>
                    <p className="text-gray-400 text-sm mb-3">
                      Enter your JIRA details manually if OAuth isn't available
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Requires API token
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Manual configuration
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 px-4 py-3 text-gray-400 hover:text-white transition-colors rounded-lg"
                disabled={loading}
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSkip}
                className="flex-1 px-4 py-3 text-gray-500 hover:text-gray-400 transition-colors rounded-lg"
                disabled={loading}
              >
                Cancel
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10">
              <div className="text-center">
                <div className="text-xs text-gray-500">
                  <p className="mb-2">Need help with JIRA setup?</p>
                  <div className="flex justify-center gap-4">
                    <a 
                      href="/JIRA_SETUP_GUIDE.md" 
                      target="_blank" 
                      className="text-blue-400 hover:text-blue-300 underline"
                    >
                      Admin Setup Guide
                    </a>
                    <a 
                      href="/JIRA_USER_ACCESS_GUIDE.md" 
                      target="_blank" 
                      className="text-blue-400 hover:text-blue-300 underline"
                    >
                      User Requirements
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Manual Setup Form */}
        {step === 3 && (
          <div className="p-8 relative">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="text-center mb-6">
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Manual JIRA Setup</h2>
              <p className="text-gray-400 text-sm">
                Enter your JIRA connection details manually
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  JIRA URL
                </label>
                <input
                  type="url"
                  name="jiraUrl"
                  value={formData.jiraUrl}
                  onChange={handleInputChange}
                  placeholder="https://yourcompany.atlassian.net"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Your JIRA instance URL (Cloud or Server)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="your.email@company.com"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Your JIRA account email address
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  API Token
                </label>
                <input
                  type="password"
                  name="apiToken"
                  value={formData.apiToken}
                  onChange={handleInputChange}
                  placeholder="Your JIRA API Token"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                  required
                />
                <div className="text-xs text-gray-500 mt-1">
                  <p className="mb-1">Create an API token in JIRA:</p>
                  <p>Account Settings → Security → API Tokens → Create Token</p>
                  <a 
                    href="https://id.atlassian.com/manage-profile/security/api-tokens" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    Create API Token →
                  </a>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Default Project Key
                </label>
                <input
                  type="text"
                  name="projectKey"
                  value={formData.projectKey}
                  onChange={handleInputChange}
                  placeholder="PROJ"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Primary project for user stories. You can access other projects after connection.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Default Issue Type
                </label>
                <select
                  name="issueType"
                  value={formData.issueType}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                >
                  <option value="Story">Story</option>
                  <option value="Task">Task</option>
                  <option value="Bug">Bug</option>
                  <option value="Epic">Epic</option>
                </select>
              </div>

              <div className="pt-4 space-y-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Connecting...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Connect to JIRA
                    </>
                  )}
                </button>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex-1 px-4 py-2 text-gray-400 hover:text-white transition-colors"
                    disabled={loading}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="flex-1 px-4 py-2 text-gray-500 hover:text-gray-400 transition-colors"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">JIRA Connected!</h2>
            <p className="text-gray-400 mb-6">
              Your JIRA account has been successfully connected. You can now create user stories and subtasks automatically.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <div className="w-4 h-4 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin"></div>
              Redirecting to dashboard...
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default JiraSetupModal;