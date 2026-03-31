import { useState } from 'react';

/**
 * Component untuk memperbaiki chat titles yang menggunakan ID numerik
 * Mengubah "Chat 1766962732099" menjadi "StoryConvert1", "StoryConvert2", dll.
 */
const ChatTitleFixer = ({ onClose }) => {
  const [isFixing, setIsFixing] = useState(false);
  const [result, setResult] = useState(null);

  // Function to generate proper StoryConvert title
  const generateStoryConvertTitle = (existingTitles) => {
    const existingNumbers = existingTitles
      .filter(title => title && title.match(/^StoryConvert(\d+)$/))
      .map(title => {
        const match = title.match(/^StoryConvert(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      });
    
    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    return `StoryConvert${maxNumber + 1}`;
  };

  // Function to fix localStorage chat history
  const fixLocalStorageChatTitles = () => {
    try {
      const historyData = localStorage.getItem('specweave_chat_history');
      if (!historyData) {
        return { fixed: 0, total: 0 };
      }

      const history = JSON.parse(historyData);
      let fixedCount = 0;
      const existingValidTitles = history
        .filter(chat => chat.title && !chat.title.match(/^Chat \d+$/))
        .map(chat => chat.title);

      // Fix each chat with problematic title
      history.forEach(chat => {
        if (chat.title && chat.title.match(/^Chat \d+$/)) {
          chat.title = generateStoryConvertTitle([...existingValidTitles, ...history.filter(c => c.id !== chat.id).map(c => c.title)]);
          existingValidTitles.push(chat.title);
          fixedCount++;
        }
      });

      // Save back to localStorage
      if (fixedCount > 0) {
        localStorage.setItem('specweave_chat_history', JSON.stringify(history));
      }

      return { fixed: fixedCount, total: history.length };
    } catch (error) {
      console.error('Error fixing localStorage:', error);
      return { fixed: 0, total: 0, error: error.message };
    }
  };

  // Function to fix localStorage chats data
  const fixLocalStorageChatsData = () => {
    try {
      const chatsData = localStorage.getItem('specweave_chats');
      if (!chatsData) {
        return { fixed: 0, total: 0 };
      }

      const chats = JSON.parse(chatsData);
      const chatIds = Object.keys(chats);
      let fixedCount = 0;

      // Get existing valid titles from history
      const historyData = localStorage.getItem('specweave_chat_history');
      const history = historyData ? JSON.parse(historyData) : [];
      const existingValidTitles = history
        .filter(chat => chat.title && !chat.title.match(/^Chat \d+$/))
        .map(chat => chat.title);

      // Fix each chat with problematic title
      chatIds.forEach(chatId => {
        const chatData = chats[chatId];
        if (chatData.title && chatData.title.match(/^Chat \d+$/)) {
          chatData.title = generateStoryConvertTitle([...existingValidTitles]);
          existingValidTitles.push(chatData.title);
          fixedCount++;
        }
      });

      // Save back to localStorage
      if (fixedCount > 0) {
        localStorage.setItem('specweave_chats', JSON.stringify(chats));
      }

      return { fixed: fixedCount, total: chatIds.length };
    } catch (error) {
      console.error('Error fixing chats data:', error);
      return { fixed: 0, total: 0, error: error.message };
    }
  };

  const handleFixTitles = async () => {
    setIsFixing(true);
    setResult(null);

    try {
      // Fix localStorage chat history
      const historyResult = fixLocalStorageChatTitles();
      
      // Fix localStorage chats data
      const chatsResult = fixLocalStorageChatsData();

      const totalFixed = historyResult.fixed + chatsResult.fixed;
      const totalProcessed = historyResult.total + chatsResult.total;

      setResult({
        success: true,
        historyResult,
        chatsResult,
        totalFixed,
        totalProcessed
      });

      // Dispatch event to notify components
      if (totalFixed > 0) {
        window.dispatchEvent(new CustomEvent('chatHistoryUpdated'));
      }

    } catch (error) {
      setResult({
        success: false,
        error: error.message
      });
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#16161e] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold text-white">Fix Chat Titles</h2>
            <p className="text-gray-400 text-sm mt-1">
              Convert "Chat 1766962732099" to "StoryConvert1", "StoryConvert2", etc.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* Description */}
          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-sm font-semibold text-blue-400">What this does</h3>
            </div>
            <div className="text-sm text-blue-300 space-y-1">
              <p>• Finds chats with titles like "Chat 1766962732099"</p>
              <p>• Converts them to proper "StoryConvert1", "StoryConvert2" format</p>
              <p>• Updates both localStorage chat history and chat data</p>
              <p>• Preserves existing StoryConvert titles</p>
            </div>
          </div>

          {/* Action Button */}
          {!result && (
            <button
              onClick={handleFixTitles}
              disabled={isFixing}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg transition-all font-semibold shadow-lg"
            >
              {isFixing ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Fixing Titles...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Fix Chat Titles
                </>
              )}
            </button>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4">
              {result.success ? (
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <h3 className="text-sm font-semibold text-green-400">Fix Complete!</h3>
                  </div>
                  
                  <div className="space-y-2 text-sm text-green-300">
                    <div className="flex justify-between">
                      <span>Chat History Fixed:</span>
                      <span className="font-medium">{result.historyResult.fixed}/{result.historyResult.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Chat Data Fixed:</span>
                      <span className="font-medium">{result.chatsResult.fixed}/{result.chatsResult.total}</span>
                    </div>
                    <div className="flex justify-between border-t border-green-500/20 pt-2 mt-2">
                      <span className="font-semibold">Total Fixed:</span>
                      <span className="font-bold">{result.totalFixed}</span>
                    </div>
                  </div>

                  {result.totalFixed > 0 && (
                    <div className="mt-3 p-2 bg-green-500/5 border border-green-500/10 rounded text-xs text-green-400">
                      ✨ Chat titles have been updated! Refresh the page to see changes.
                    </div>
                  )}

                  {result.totalFixed === 0 && result.totalProcessed > 0 && (
                    <div className="mt-3 p-2 bg-blue-500/5 border border-blue-500/10 rounded text-xs text-blue-400">
                      🎉 All chat titles are already in the correct format!
                    </div>
                  )}

                  {result.totalProcessed === 0 && (
                    <div className="mt-3 p-2 bg-gray-500/5 border border-gray-500/10 rounded text-xs text-gray-400">
                      📭 No chat data found to process.
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="text-sm font-semibold text-red-400">Fix Failed</h3>
                  </div>
                  <p className="text-sm text-red-300">{result.error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-white/20 text-gray-300 rounded-lg hover:bg-white/5 transition-all"
                >
                  Close
                </button>
                {result.success && result.totalFixed > 0 && (
                  <button
                    onClick={() => window.location.reload()}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
                  >
                    Refresh Page
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatTitleFixer;