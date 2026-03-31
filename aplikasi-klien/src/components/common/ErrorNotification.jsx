import React, { useState } from 'react'
import { globalErrorHandler } from '../../utils/errors/errorHandler.js'

/**
 * Error notification component for displaying errors to users
 */
export function ErrorNotification({ error, onClose, onRetry, showTroubleshooting = true }) {
  const [showDetails, setShowDetails] = useState(false)
  
  if (!error) return null

  const displayMessage = globalErrorHandler.getDisplayMessage(error)
  const troubleshootingTips = globalErrorHandler.getTroubleshootingTips(error)

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'red'
      case 'high': return 'orange'
      case 'medium': return 'yellow'
      case 'low': return 'blue'
      default: return 'gray'
    }
  }

  const severityColor = getSeverityColor(error.severity)

  return (
    <div className={`border-l-4 border-${severityColor}-400 bg-${severityColor}-50 p-4 rounded-md shadow-sm`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <svg 
            className={`h-5 w-5 text-${severityColor}-400`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" 
            />
          </svg>
        </div>
        
        <div className="ml-3 flex-1">
          <div className="flex items-center justify-between">
            <h3 className={`text-sm font-medium text-${severityColor}-800`}>
              {error.type === 'network' && 'Masalah Koneksi'}
              {error.type === 'server' && 'Masalah Server'}
              {error.type === 'validation' && 'Kesalahan Input'}
              {error.type === 'auth' && 'Masalah Autentikasi'}
              {error.type === 'jira' && 'Masalah JIRA'}
              {error.type === 'export' && 'Masalah Export'}
              {error.type === 'permission' && 'Akses Ditolak'}
              {!['network', 'server', 'validation', 'auth', 'jira', 'export', 'permission'].includes(error.type) && 'Kesalahan'}
            </h3>
            
            <button
              onClick={onClose}
              className={`text-${severityColor}-400 hover:text-${severityColor}-600 transition-colors`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className={`mt-2 text-sm text-${severityColor}-700`}>
            <p>{displayMessage}</p>
          </div>

          {showTroubleshooting && troubleshootingTips.length > 0 && (
            <div className="mt-3">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className={`text-xs text-${severityColor}-600 hover:text-${severityColor}-800 underline`}
              >
                {showDetails ? 'Sembunyikan' : 'Tampilkan'} Saran Penyelesaian
              </button>
              
              {showDetails && (
                <div className="mt-2">
                  <ul className={`text-xs text-${severityColor}-600 list-disc list-inside space-y-1`}>
                    {troubleshootingTips.map((tip, index) => (
                      <li key={index}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 flex space-x-2">
            {onRetry && (
              <button
                onClick={onRetry}
                className={`bg-${severityColor}-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-${severityColor}-700 focus:outline-none focus:ring-2 focus:ring-${severityColor}-500 transition-colors`}
              >
                Coba Lagi
              </button>
            )}
            
            <button
              onClick={onClose}
              className={`bg-${severityColor}-100 text-${severityColor}-800 px-3 py-1 rounded text-xs font-medium hover:bg-${severityColor}-200 focus:outline-none focus:ring-2 focus:ring-${severityColor}-500 transition-colors`}
            >
              Tutup
            </button>
          </div>

          {error.id && (
            <div className="mt-2">
              <p className={`text-xs text-${severityColor}-500`}>
                ID Error: {error.id}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Error list component for displaying multiple errors
 */
export function ErrorList({ errors, onClearError, onClearAll, maxVisible = 3 }) {
  const [showAll, setShowAll] = useState(false)
  
  if (!errors || errors.length === 0) return null

  const visibleErrors = showAll ? errors : errors.slice(0, maxVisible)
  const hasMore = errors.length > maxVisible

  return (
    <div className="space-y-3">
      {visibleErrors.map((error, index) => (
        <ErrorNotification
          key={error.id || index}
          error={error}
          onClose={() => onClearError(error.id || index)}
          onRetry={() => {
            // Retry logic would be handled by parent component
            console.log('Retry requested for error:', error.id)
          }}
        />
      ))}
      
      {hasMore && (
        <div className="text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            {showAll ? 'Tampilkan Lebih Sedikit' : `Tampilkan ${errors.length - maxVisible} Error Lainnya`}
          </button>
        </div>
      )}
      
      {errors.length > 1 && (
        <div className="text-center">
          <button
            onClick={onClearAll}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Hapus Semua Error
          </button>
        </div>
      )}
    </div>
  )
}

export default ErrorNotification