import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ErrorProvider } from './contexts/ErrorContext';
import { JiraProvider } from './contexts/JiraContext';
import { TestResultsProvider } from './contexts/TestResultsContext';
import { ChatProvider } from './contexts/ChatContext';
import { LoadingProvider } from './contexts/LoadingContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import InterruptedTestsNotification from './components/common/InterruptedTestsNotification';
import PageTransition from './components/navigation/PageTransition';
import { initializeAutoSaveSettings } from './utils/autoSaveSettings';

import Landing from './pages/Landing';
import LoginSignup from './pages/LoginSignup';
import ChatRefined from './pages/ChatRefined';
import Profile from './pages/Profile';
import JiraCallback from './pages/JiraCallback';
import AuthCallback from './pages/AuthCallback';
import MeteorResults from './pages/MeteorResults';
import TestResultsDetailPage from './pages/TestResultsDetailPage';
import PasswordReset from './pages/PasswordReset';
import EvaluationHistory from './components/evaluation/EvaluationHistory';

function App() {
  // Initialize auto-save settings on app startup
  React.useEffect(() => {
    initializeAutoSaveSettings();
    
  }, []);

  // Handle interrupted test actions
  const handleResumeTest = (testState) => {
    // Navigate to appropriate page or open modal based on test state
    console.log('Resuming test:', testState);
    // Implementation would depend on specific requirements
  };

  const handleCancelTest = (testId) => {
    console.log('Cancelled test:', testId);
    // Clean up any remaining state
  };

  return (
    <ErrorBoundary>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <AuthProvider>
          <ErrorProvider>
            <LoadingProvider>
              <JiraProvider>
                <TestResultsProvider>
                  <ChatProvider>
                <Routes>
            {/* Public Routes */}
            <Route path="/" element={
              <PageTransition>
                <Landing />
              </PageTransition>
            } />
            <Route path="/login" element={
              <PageTransition>
                <LoginSignup />
              </PageTransition>
            } />
            
            {/* Auth Callback Routes */}
            <Route path="/auth/callback" element={
              <PageTransition>
                <AuthCallback />
              </PageTransition>
            } />
            <Route path="/reset-password" element={
              <PageTransition>
                <PasswordReset />
              </PageTransition>
            } />
            <Route 
              path="/auth/jira/callback" 
              element={
                <ProtectedRoute>
                  <PageTransition>
                    <JiraCallback />
                  </PageTransition>
                </ProtectedRoute>
              } 
            />
            
            {/* Protected Routes */}
            <Route 
              path="/chat" 
              element={
                <ProtectedRoute>
                  <PageTransition>
                    <ChatRefined />
                  </PageTransition>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <PageTransition>
                    <Profile />
                  </PageTransition>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/meteor-results/:testId" 
              element={
                <ProtectedRoute>
                  <PageTransition>
                    <MeteorResults />
                  </PageTransition>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/test-results/:scenarioId" 
              element={
                <ProtectedRoute>
                  <PageTransition>
                    <TestResultsDetailPage />
                  </PageTransition>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/evaluation-history" 
              element={
                <ProtectedRoute>
                  <PageTransition>
                    <EvaluationHistory />
                  </PageTransition>
                </ProtectedRoute>
              } 
            />
            
            {/* Redirect unknown routes to landing */}
            <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
                  </ChatProvider>
                </TestResultsProvider>
              </JiraProvider>
              
              {/* Interrupted Tests Notification */}
              <InterruptedTestsNotification 
                onResumeTest={handleResumeTest}
                onCancelTest={handleCancelTest}
              />
            </LoadingProvider>
          </ErrorProvider>
        </AuthProvider>
        
        {/* Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#09090A',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              fontSize: '14px',
              padding: '18px 24px',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#ffffff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#ffffff',
              },
            },
          }}
        />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
