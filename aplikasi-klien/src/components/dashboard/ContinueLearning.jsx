import { motion } from 'framer-motion';

const ContinueLearning = ({ onStartChat, onOpenTemplates, onOpenKnowledgeBase }) => {
  const learningItems = [
    {
      id: 1,
      title: "Advanced Gherkin Scenarios",
      description: "Master complex scenario writing with AI assistance",
      progress: 75,
      type: "SCENARIO WRITING",
      icon: "📝",
      color: "from-purple-600 to-pink-600",
      action: onStartChat
    },
    {
      id: 2,
      title: "METEOR Quality Assessment",
      description: "Learn to evaluate and improve scenario quality",
      progress: 60,
      type: "QUALITY ANALYSIS",
      icon: "📊",
      color: "from-blue-600 to-cyan-600",
      action: onOpenKnowledgeBase
    },
    {
      id: 3,
      title: "Template Mastery",
      description: "Explore pre-built templates for faster development",
      progress: 45,
      type: "TEMPLATES",
      icon: "🎯",
      color: "from-green-600 to-emerald-600",
      action: onOpenTemplates
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Continue Learning</h2>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
            <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
            <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {learningItems.map((item, index) => (
          <motion.div
            key={item.id}
            className="group relative overflow-hidden bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-2xl p-6 cursor-pointer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={item.action}
          >
            {/* Background gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
            
            {/* Bookmark icon */}
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>

            <div className="relative z-10">
              {/* Course type badge */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">{item.icon}</span>
                <span className="text-xs font-medium text-purple-400 bg-purple-500/10 px-2 py-1 rounded-full">
                  {item.type}
                </span>
              </div>

              {/* Content */}
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-purple-100 transition-colors">
                {item.title}
              </h3>
              <p className="text-sm text-white/60 mb-4 line-clamp-2">
                {item.description}
              </p>

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">Progress</span>
                  <span className="text-white font-medium">{item.progress}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <motion.div
                    className={`h-full bg-gradient-to-r ${item.color} rounded-full`}
                    initial={{ width: 0 }}
                    animate={{ width: `${item.progress}%` }}
                    transition={{ duration: 1, delay: index * 0.2 }}
                  ></motion.div>
                </div>
              </div>

              {/* Action button */}
              <motion.button
                className="w-full mt-4 py-2 px-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl text-sm text-white transition-all duration-200"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Continue Learning
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ContinueLearning;