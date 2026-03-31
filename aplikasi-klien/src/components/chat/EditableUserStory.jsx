import { useState } from 'react';
import { motion } from 'framer-motion';

const EditableUserStory = ({ userStory, onSave, onCancel }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(userStory);

  const handleSave = () => {
    if (onSave) {
      onSave(editedText);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedText(userStory);
    setIsEditing(false);
    if (onCancel) {
      onCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="bg-[#09090A] border border-white/5 rounded-2xl p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-6 h-6 rounded-full bg-purple-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-3 h-3 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="text-xs font-medium text-purple-400 mb-2">User Story</div>
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="w-full bg-transparent border-none rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none resize-none leading-relaxed"
              rows={3}
              autoFocus
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-[#09090A] border border-white/5 rounded-lg text-sm font-semibold text-white/70 transition-all hover:bg-[#0a0a0b]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-[#160D14] border border-[#44273D] rounded-lg text-sm font-semibold text-[#FF7AD0] transition-all hover:bg-[#1a1018]"
          >
            Save Changes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-500/15 via-pink-500/10 to-purple-500/15 border border-purple-400/30 rounded-2xl p-4 group hover:border-purple-400/50 hover:shadow-lg hover:shadow-purple-500/10 transition-all">
      <div className="flex items-start gap-3">
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500/40 to-pink-500/40 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md shadow-purple-500/20">
          <svg className="w-3 h-3 text-purple-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-purple-300">User Story</div>
            <button
              onClick={() => setIsEditing(true)}
              className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 hover:border-purple-400/50 flex items-center justify-center transition-all"
            >
              <svg className="w-3 h-3 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-100 leading-relaxed italic">
            "{userStory}"
          </p>
        </div>
      </div>
    </div>
  );
};

export default EditableUserStory;
