import { motion } from 'framer-motion';

const TeamSection = () => {
  const mentors = [
    {
      id: 1,
      name: 'AI Assistant',
      role: 'Gherkin Expert',
      avatar: '🤖',
      status: 'online',
      expertise: 'Scenario Generation'
    },
    {
      id: 2,
      name: 'METEOR Evaluator',
      role: 'Quality Analyst',
      avatar: '📊',
      status: 'online',
      expertise: 'Quality Assessment'
    },
    {
      id: 3,
      name: 'JIRA Integration',
      role: 'Project Manager',
      avatar: '🔗',
      status: 'available',
      expertise: 'Project Integration'
    }
  ];

  return (
    <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Your AI Team</h3>
        <button className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
          See All
        </button>
      </div>

      <div className="space-y-4">
        {mentors.map((mentor, index) => (
          <motion.div
            key={mentor.id}
            className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-200 cursor-pointer group"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-lg shadow-lg">
                {mentor.avatar}
              </div>
              <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#020203] ${
                mentor.status === 'online' ? 'bg-green-500' : 'bg-yellow-500'
              }`}></div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-white truncate">{mentor.name}</h4>
                <button className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-purple-400 hover:text-purple-300 px-2 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20">
                  Chat
                </button>
              </div>
              <p className="text-xs text-white/60 truncate">{mentor.role}</p>
              <p className="text-xs text-white/40 truncate">{mentor.expertise}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.button
        className="w-full mt-4 p-3 rounded-xl bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/20 text-sm text-white hover:from-purple-600/30 hover:to-blue-600/30 hover:border-purple-500/30 transition-all duration-200"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Start Team Collaboration
        </div>
      </motion.button>
    </div>
  );
};

export default TeamSection;