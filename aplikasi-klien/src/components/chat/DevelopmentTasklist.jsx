import { motion } from 'framer-motion';

const DevelopmentTasklist = ({ tasks = [], onExport }) => {
  const priorityColors = {
    High: 'from-red-500/20 to-red-600/20 border-red-500/30 text-red-400',
    Medium: 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30 text-yellow-400',
    Low: 'from-green-500/20 to-green-600/20 border-green-500/30 text-green-400'
  };

  const statusColors = {
    'To Do': 'from-gray-500/20 to-gray-600/20 border-gray-500/30 text-gray-400',
    'In Progress': 'from-blue-500/20 to-blue-600/20 border-blue-500/30 text-blue-400',
    'Done': 'from-green-500/20 to-green-600/20 border-green-500/30 text-green-400'
  };

  if (!tasks || tasks.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-[#020203]/80 to-black/90 border border-white/10 rounded-3xl p-6 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Development Tasklist</h3>
        
        {onExport && (
          <button
            onClick={onExport}
            className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 rounded-lg text-sm font-medium text-white transition-all"
            title="Export to JIRA"
          >
            <span>Export ke</span>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.001 1.001 0 0 0 23.013 0z"/>
            </svg>
          </button>
        )}
      </div>

      {/* Tasks Grid */}
      <div className="grid grid-cols-2 gap-4">
        {tasks.map((task, index) => (
          <motion.div
            key={index}
            className="bg-gradient-to-br from-[#020203]/80 to-black/90 border border-white/10 rounded-2xl p-4 hover:border-white/20 transition-all"
            whileHover={{ scale: 1.02 }}
          >
            {/* Task Header */}
            <div className="flex items-center gap-2 mb-3">
              {/* Priority Badge */}
              <div className={`px-3 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r ${priorityColors[task.priority] || priorityColors.Medium} border`}>
                {task.priority}
              </div>

              {/* Status Badge */}
              <div className={`px-3 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r ${statusColors[task.status] || statusColors['To Do']} border`}>
                {task.status}
              </div>
            </div>

            {/* Task Description */}
            <p className="text-sm text-gray-300 leading-relaxed">
              {task.description}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default DevelopmentTasklist;
