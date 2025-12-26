/**
 * Hero Section Component
 * Main hero section with animated elements and call-to-action
 */

import { forwardRef } from 'react';
import { LANDING_CONTENT } from '../../utils/constants/landingConstants.js';
import AnimatedCounter from './AnimatedCounter.jsx';

const HeroSection = forwardRef(({ isVisible }, ref) => {
  const { HERO } = LANDING_CONTENT;

  return (
    <section className="relative pt-48 pb-32 min-h-screen flex items-center justify-center z-10">
      <div 
        ref={ref}
        className={`relative max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12 text-center w-full transition-all duration-1000 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-gray-300 mb-8 animate-fade-in-up hover:bg-white/10 transition-colors cursor-default backdrop-blur-md shadow-sm ring-1 ring-white/5 hover:ring-pink-500/20">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
          </span>
          <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            {HERO.BADGE_TEXT}
          </span>
        </div>

        {/* Main Title */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.1] mb-8 tracking-tight text-white">
          Transformasi User Story ke <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-300 animate-gradient bg-[length:200%_auto]">
            Gherkin Backlog
          </span>
        </h1>
        
        {/* Subtitle */}
        <p className="text-gray-400 text-lg sm:text-xl max-w-2xl mx-auto mb-16 leading-relaxed font-light">
          {HERO.SUBTITLE}
        </p>

        {/* AI Icon Circle Animation */}
        <div className="relative w-48 h-48 mx-auto mb-12 group cursor-pointer perspective-1000">
          <div className="absolute inset-0 rounded-full border border-purple-500/20 animate-[spin_10s_linear_infinite]" />
          <div className="absolute inset-4 rounded-full border border-pink-500/20 animate-[spin_15s_linear_infinite_reverse]" />
          
          <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 to-pink-500/20 rounded-full blur-2xl group-hover:blur-3xl transition-all duration-500 opacity-60" />
          
          <div className="absolute inset-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-2xl shadow-purple-500/30 group-hover:shadow-purple-500/50 transition-all duration-500 group-hover:scale-105 transform z-10 border border-white/10">
            <span className="text-3xl font-bold text-white drop-shadow-md">AI</span>
          </div>

          {/* Floating Icons */}
          {[
            { icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", color: "text-purple-200", delay: "0ms", pos: "-top-2 left-1/2 -translate-x-1/2", bg: "from-purple-500/20 to-transparent" },
            { icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z", color: "text-pink-200", delay: "1000ms", pos: "top-1/2 -right-2 -translate-y-1/2", bg: "from-pink-500/20 to-transparent" },
            { icon: "M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", color: "text-purple-200", delay: "2000ms", pos: "-bottom-2 left-1/2 -translate-x-1/2", bg: "from-purple-600/20 to-transparent" },
            { icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15", color: "text-pink-200", delay: "3000ms", pos: "top-1/2 -left-2 -translate-y-1/2", bg: "from-pink-600/20 to-transparent" }
          ].map((item, idx) => (
            <div key={idx} className={`absolute ${item.pos} w-10 h-10 rounded-xl bg-gradient-to-br ${item.bg} bg-[#020203] border border-white/10 flex items-center justify-center shadow-lg animate-float z-20 backdrop-blur-sm`} style={{ animationDelay: item.delay }}>
              <svg className={`w-5 h-5 ${item.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
              </svg>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});

HeroSection.displayName = 'HeroSection';

export default HeroSection;