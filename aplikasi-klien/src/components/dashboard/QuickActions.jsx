import { motion } from 'framer-motion';

const QuickActions = ({ onStartChat, onOpenTemplates, onOpenKnowledgeBase }) => {
  const quickActions = [
    {
      id: 'new-scenario',
      title: 'New Scenario',
      description: 'Start creating',
      icon: '⚡',
      color: 'from-purple-500 to-pink-500',
      action: onStartChat
    },
    {
      id: 'browse-templates',
      title: 'Templates',
      description: 'Quick start',
      icon: '📋',
      color: 'from-green-500 to-emerald-500',
      action: onOpenTemplates
    },
    {
      id: 'knowledge-base',
      title: 'References',
      description: 'Browse library',
      icon: '📚',
      color: 'from-blue-500 to-cyan-500',
      action: onOpenKnowledgeBase
    }
  ];

  return (
    <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
      </div>

      <div className="space-y-3">
        {quickActions.map((action, index) => (
          <motion.button
            key={action.id}
            onClick={action.action}
            className="w-full group relative overflow-hidden bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] hover:border-white/[0.1] rounded-xl p-4 transition-all duration-200 text-left"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center text-lg shadow-lg group-hover:scale-110 transition-transform duration-200`}>
                {action.icon}
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-white group-hover:text-purple-100 transition-colors">
                  {action.title}
                </h4>
                <p className="text-xs text-white/60 group-hover:text-white/80 transition-colors">
                  {action.description}
                </p>
              </div>
              <svg className="w-4 h-4 text-white/40 group-hover:text-white/60 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;