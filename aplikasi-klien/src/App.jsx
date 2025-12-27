import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { JiraProvider } from './contexts/JiraContext';
import { TestResultsProvider } from './contexts/TestResultsContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';

import Landing from './pages/Landing';
import ChatRefined from './pages/ChatRefined';
import Dashboard from './pages/Dashboard';
import JiraCallback from './pages/JiraCallback';
import AuthCallback from './pages/AuthCallback';
import MeteorResults from './pages/MeteorResults';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <AuthProvider>
          <JiraProvider>
            <TestResultsProvider>
            <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            
            {/* OAuth Callback Routes */}
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route 
              path="/auth/jira/callback" 
              element={
                <ProtectedRoute>
                  <JiraCallback />
                </ProtectedRoute>
              } 
            />
            
            {/* Protected Routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/chat" 
              element={
                <ProtectedRoute>
                  <ChatRefined />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/meteor-results/:testId" 
              element={
                <ProtectedRoute>
                  <MeteorResults />
                </ProtectedRoute>
              } 
            />
            
            {/* Redirect unknown routes to landing */}
            <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </TestResultsProvider>
          </JiraProvider>
        </AuthProvider>
        
        {/* Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1a1a24',
              color: '#ffffff',
              border: '1px solid rgba(147, 51, 234, 0.3)',
              borderRadius: '12px',
              fontSize: '14px',
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
