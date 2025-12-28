import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { jiraService } from '../services/jiraService';
import LoadingSpinner from '../components/common/LoadingSpinner';

const JiraCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing'); // processing, success, error
  const [message, setMessage] = useState('Processing JIRA OAuth callback...');

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        const oauthToken = searchParams.get('oauth_token');
        const oauthVerifier = searchParams.get('oauth_verifier');
        const denied = searchParams.get('denied');

        // Check if user denied authorization
        if (denied) {
          setStatus('error');
          setMessage('JIRA authorization was denied. You can try again from the dashboard.');
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 3000);
          return;
        }

        // Check if we have required parameters
        if (!oauthToken || !oauthVerifier) {
          setStatus('error');
          setMessage('Invalid OAuth callback parameters. Please try connecting again.');
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 3000);
          return;
        }

        // Complete OAuth flow
        setMessage('Completing JIRA connection...');
        const result = await jiraService.completeOAuthFlow(oauthToken, oauthVerifier);

        if (result.success) {
          setStatus('success');
          setMessage('JIRA connected successfully! Redirecting to dashboard...');
          
          // Store connection info in localStorage for immediate use
          localStorage.setItem('jira_connection_success', JSON.stringify({
            connection: result.data,
            timestamp: Date.now()
          }));

          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 2000);
        } else {
          throw new Error(result.error || 'Failed to complete JIRA connection');
        }
      } catch (error) {
        setStatus('error');
        setMessage(error.message || 'Failed to connect to JIRA. Please try again.');
        
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 3000);
      }
    };

    handleOAuthCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-[#020203] text-white flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        {/* Status Icon */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center shadow-lg">
          {status === 'processing' && (
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 w-full h-full rounded-2xl flex items-center justify-center">
              <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
            </div>
          )}
          
          {status === 'success' && (
            <div className="bg-gradient-to-br from-green-600 to-emerald-600 w-full h-full rounded-2xl flex items-center justify-center shadow-green-500/20">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          
          {status === 'error' && (
            <div className="bg-gradient-to-br from-red-600 to-red-700 w-full h-full rounded-2xl flex items-center justify-center shadow-red-500/20">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
        </div>

        {/* Status Message */}
        <h2 className="text-2xl font-bold text-white mb-4">
          {status === 'processing' && 'Connecting to JIRA...'}
          {status === 'success' && 'Connection Successful!'}
          {status === 'error' && 'Connection Failed'}
        </h2>

        <p className="text-gray-400 mb-6">{message}</p>

        {/* Loading Spinner for processing */}
        {status === 'processing' && (
          <LoadingSpinner size="sm" text="Please wait..." />
        )}

        {/* Manual redirect button for errors */}
        {status === 'error' && (
          <button
            onClick={() => navigate('/dashboard', { replace: true })}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Return to Dashboard
          </button>
        )}

        {/* Success animation */}
        {status === 'success' && (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <div className="w-4 h-4 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin"></div>
            Redirecting...
          </div>
        )}
      </div>
    </div>
  );
};

export default JiraCallback;