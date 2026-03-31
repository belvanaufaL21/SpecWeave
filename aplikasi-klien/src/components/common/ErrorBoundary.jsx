import React from 'react';
import { globalErrorHandler } from '../../utils/errors/errorHandler.js';
import { getTroubleshootingTips } from '../../utils/errors/errorMessages.js';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorId: null,
      showDetails: false
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Handle error through global error handler
    const handledError = globalErrorHandler.handleError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: this.props.name || 'ErrorBoundary',
      props: this.props
    });

    this.setState({
      error: handledError,
      errorId: handledError.id || `err_${Date.now()}`
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorId: null, showDetails: false });
  }

  handleReload = () => {
    window.location.reload();
  }

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  }

  render() {
    if (this.state.hasError) {
      const { error } = this.state;
      const displayMessage = error ? globalErrorHandler.getDisplayMessage(error) : 'Terjadi kesalahan tak terduga';
      const troubleshootingTips = error ? globalErrorHandler.getTroubleshootingTips(error) : [];
      const fallbackUI = this.props.fallback;

      // If custom fallback UI is provided, use it
      if (fallbackUI) {
        return fallbackUI(error, this.handleRetry);
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-lg w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  Terjadi Kesalahan
                </h3>
                {this.state.errorId && (
                  <p className="text-xs text-gray-500 mt-1">
                    ID Error: {this.state.errorId}
                  </p>
                )}
              </div>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-700 mb-3">
                {displayMessage}
              </p>

              {troubleshootingTips.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">
                    Saran Penyelesaian:
                  </h4>
                  <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
                    {troubleshootingTips.map((tip, index) => (
                      <li key={index}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex flex-col space-y-3">
              <div className="flex space-x-3">
                <button
                  onClick={this.handleRetry}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  Coba Lagi
                </button>
                <button
                  onClick={this.handleReload}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                >
                  Muat Ulang Halaman
                </button>
              </div>

              {process.env.NODE_ENV === 'development' && (
                <button
                  onClick={this.toggleDetails}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  {this.state.showDetails ? 'Sembunyikan' : 'Tampilkan'} Detail Error
                </button>
              )}
            </div>

            {this.state.showDetails && process.env.NODE_ENV === 'development' && (
              <div className="mt-4 p-3 bg-gray-100 rounded-md">
                <h4 className="text-xs font-medium text-gray-700 mb-2">Detail Error:</h4>
                <pre className="text-xs text-gray-600 overflow-auto max-h-32">
                  {JSON.stringify(error?.toJSON ? error.toJSON() : error, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;