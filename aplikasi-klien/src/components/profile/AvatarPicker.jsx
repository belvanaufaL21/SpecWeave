import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const AVATAR_EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
  '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
  '😎', '🤓', '🧐', '🤠', '🥳', '🤗', '🤔', '🤨',
  '😏', '😌', '😔', '😴', '🤤', '😪', '😷', '🤒',
  '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵',
  '🤯', '🤠', '🥳', '😺', '😸', '😹', '😻', '😼',
  '😽', '🙀', '😿', '😾', '🐶', '🐱', '🐭', '🐹',
  '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮',
  '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐔', '🐧',
  '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗',
  '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜',
  '🦟', '🦗', '🕷', '🦂', '🐢', '🐍', '🦎', '🦖',
  '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠',
  '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆',
  '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫',
  '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏',
  '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐈',
  '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🕊', '🐇',
  '🦝', '🦨', '🦡', '🦦', '🦥', '🐁', '🐀', '🐿',
  '🦔', '🌸', '🌺', '🌻', '🌷', '🌹', '🥀', '🌼',
  '🌵', '🌲', '🌳', '🌴', '🌱', '🌿', '☘️', '🍀',
  '🍁', '🍂', '🍃', '🎋', '🎍', '🍇', '🍈', '🍉',
  '🍊', '🍋', '🍌', '🍍', '🥭', '🍎', '🍏', '🍐',
  '🍑', '🍒', '🍓', '🥝', '🍅', '🥥', '🥑', '🍆',
  '🥔', '🥕', '🌽', '🌶', '🥒', '🥬', '🥦', '🧄',
  '🧅', '🍄', '🥜', '🌰', '🍞', '🥐', '🥖', '🥨',
  '🥯', '🥞', '🧇', '🧀', '🍖', '🍗', '🥩', '🥓',
  '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🌯', '🥙',
  '🧆', '🥚', '🍳', '🥘', '🍲', '🥣', '🥗', '🍿',
  '🧈', '🧂', '🥫', '🍱', '🍘', '🍙', '🍚', '🍛',
  '🍜', '🍝', '🍠', '🍢', '🍣', '🍤', '🍥', '🥮',
  '🍡', '🥟', '🥠', '🥡', '🦀', '🦞', '🦐', '🦑',
  '🦪', '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰',
  '🧁', '🥧', '🍫', '🍬', '🍭', '🍮', '🍯', '🍼',
  '🥛', '☕', '🍵', '🍶', '🍾', '🍷', '🍸', '🍹',
  '🍺', '🍻', '🥂', '🥃', '🥤', '🧃', '🧉', '🧊',
  '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉',
  '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍',
  '🏏', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊',
  '🥋', '🎽', '🛹', '🛷', '⛸', '🥌', '🎿', '⛷',
  '🏂', '🪂', '🏋️', '🤼', '🤸', '🤺', '⛹️', '🤾',
  '🏌️', '🏇', '🧘', '🏊', '🤽', '🚣', '🧗', '🚵',
  '🚴', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖', '🎗',
];

const AvatarPicker = ({ currentAvatar, onSelect, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', label: 'All', icon: '🎨' },
    { id: 'smileys', label: 'Smileys', icon: '😀', range: [0, 48] },
    { id: 'animals', label: 'Animals', icon: '🐶', range: [48, 144] },
    { id: 'nature', label: 'Nature', icon: '🌸', range: [144, 192] },
    { id: 'food', label: 'Food', icon: '🍕', range: [192, 288] },
    { id: 'sports', label: 'Sports', icon: '⚽', range: [288, 360] },
  ];

  const getFilteredEmojis = () => {
    let emojis = AVATAR_EMOJIS;
    
    if (selectedCategory !== 'all') {
      const category = categories.find(c => c.id === selectedCategory);
      if (category && category.range) {
        emojis = AVATAR_EMOJIS.slice(category.range[0], category.range[1]);
      }
    }
    
    if (searchQuery) {
      // Simple search - you can enhance this
      return emojis;
    }
    
    return emojis;
  };

  const filteredEmojis = getFilteredEmojis();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-transparent border border-white/5 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Choose Your Avatar</h3>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-transparent hover:bg-white/[0.03] transition-colors"
            >
              <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all
                  ${selectedCategory === category.id
                    ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-white'
                    : 'bg-transparent border border-white/5 text-white/60 hover:bg-white/[0.03]'
                  }
                `}
              >
                <span className="text-lg">{category.icon}</span>
                <span className="text-sm font-medium">{category.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Emoji Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-2">
            {filteredEmojis.map((emoji, index) => (
              <motion.button
                key={index}
                onClick={() => onSelect(emoji)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className={`
                  aspect-square rounded-xl flex items-center justify-center text-3xl
                  transition-all cursor-pointer
                  ${currentAvatar === emoji
                    ? 'bg-gradient-to-br from-purple-500/30 to-pink-500/30 border-2 border-purple-500/50 shadow-lg'
                    : 'bg-transparent hover:bg-white/[0.03] border border-white/5'
                  }
                `}
              >
                {emoji}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-transparent hover:bg-white/[0.03] border border-white/5 rounded-xl text-white/60 hover:text-white transition-all"
            >
              Cancel
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-500/20 rounded-xl text-white transition-all"
            >
              Done
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AvatarPicker;
