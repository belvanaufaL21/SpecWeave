import { useState, useEffect } from 'react';
import { useJiraExports } from '../../contexts/JiraExportsContext';
import { formatDistanceToNow } from 'date-fns';

const JiraExportHistory = ({ chatId = null, limit = 10 }) => {
  const { 
    exports, 
    loading, 
    stats, 
    loadExportsFromDatabase,
    getExportsForChat,
    deleteExport 
  } = useJiraExports();
  
  const [showAll, setShowAll] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    loadExportsFromDatabase(chatId);
  }, [chatId, loadExportsFromDatabase]);

  const displayExports = chatId 
    ? getExportsForChat(chatId) 
    : exports;

  const visibleExports = showAll 
    ? displayExports 
    : displayExports.slice(0, limit);

  const handleDelete = async (exportId) => {
    if (!confirm('Are you sure you want to delete this export record?')) {
      return;
    }

    setDeletingId(exportId);
    try {
      await deleteExport(exportId);
    } catch (error) {
      console.error('Failed to delete export:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return (
          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'failed':
        return (
          <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'timeout':
        return (
          <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'failed': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'timeout': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  if (loading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-6 h-6 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
          <h3 className="text-lg font-semibold text-white">Loading Export History...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-semibold text-white">
            {chatId ? 'Chat Export History' : 'JIRA Export History'}
          </h3>
        </div>
        
        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-green-400">{stats.successful}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-400 rounded-full"></div>
            <span className="text-red-400">{stats.failed}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
            <span className="text-yellow-400">{stats.timeout}</span>
          </div>
        </div>
      </div>

      {/* Export List */}
      {displayExports.length === 0 ? (
        <div className="text-center py-8">
          <svg className="w-12 h-12 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-400">No JIRA exports yet</p>
          <p className="text-gray-500 text-sm mt-1">Export your first scenario to see it here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleExports.map((exportItem) => (
            <div
              key={exportItem.id}
              className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon(exportItem.export_status)}
                    <span className="font-medium text-white">
                      {exportItem.export_data?.title || exportItem.export_data?.featureName || 'Untitled Export'}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs border ${getStatusColor(exportItem.export_status)}`}>
                      {exportItem.export_status}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-300 mb-3">
                    <div>
                      <span className="text-gray-400">JIRA Story:</span>
                      {exportItem.jira_story_key ? (
                        <a
                          href={exportItem.jira_story_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-blue-400 hover:text-blue-300 underline"
                        >
                          {exportItem.jira_story_key}
                        </a>
                      ) : (
                        <span className="ml-2 text-gray-500">N/A</span>
                      )}
                    </div>
                    <div>
                      <span className="text-gray-400">Scenarios:</span>
                      <span className="ml-2">{exportItem.scenario_count || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Project:</span>
                      <span className="ml-2">{exportItem.jira_project_key || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Exported:</span>
                      <span className="ml-2">
                        {formatDistanceToNow(new Date(exportItem.exported_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  {/* Error Message */}
                  {exportItem.error_message && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-3">
                      <p className="text-red-300 text-sm">{exportItem.error_message}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleDelete(exportItem.id)}
                    disabled={deletingId === exportItem.id}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10 disabled:opacity-50"
                    title="Delete export record"
                  >
                    {deletingId === exportItem.id ? (
                      <div className="w-4 h-4 border border-gray-400/30 border-t-gray-400 rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Show More Button */}
          {displayExports.length > limit && (
            <div className="text-center pt-4">
              <button
                onClick={() => setShowAll(!showAll)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm text-white transition-colors"
              >
                {showAll ? 'Show Less' : `Show All (${displayExports.length})`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default JiraExportHistory;