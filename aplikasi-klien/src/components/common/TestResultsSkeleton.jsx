import React from 'react';
import { motion } from 'framer-motion';

/**
 * Skeleton loader for test results page
 * Provides visual feedback while content is loading
 */
const TestResultsSkeleton = ({ variant = 'full' }) => {
  // Animation variants for skeleton elements
  const shimmer = {
    initial: { opacity: 0.6 },
    animate: { opacity: 1 },
    transition: {
      repeat: Infinity,
      repeatType: "reverse",
      duration: 1.2,
      ease: "easeInOut"
    }
  };

  // Compact skeleton for smaller spaces
  if (variant === 'compact') {
    return (
      <div className="space-y-4">
        {/* Header skeleton */}
        <div className="flex items-center gap-3">
          <motion.div 
            {...shimmer}
            className="w-10 h-10 bg-white/10 rounded-xl"
          />
          <div className="space-y-2 flex-1">
            <motion.div 
              {...shimmer}
              className="h-4 bg-white/10 rounded w-32"
            />
            <motion.div 
              {...shimmer}
              className="h-3 bg-white/5 rounded w-24"
            />
          </div>
        </div>

        {/* Progress skeleton */}
        <motion.div 
          {...shimmer}
          className="h-2 bg-white/10 rounded-full w-full"
        />

        {/* Content skeleton */}
        <div className="space-y-2">
          <motion.div 
            {...shimmer}
            className="h-3 bg-white/5 rounded w-full"
          />
          <motion.div 
            {...shimmer}
            className="h-3 bg-white/5 rounded w-3/4"
          />
        </div>
      </div>
    );
  }

  // Full skeleton for main content areas
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-purple-500/20 overflow-hidden">
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header skeleton */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-0 mb-6 lg:mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <motion.div 
              {...shimmer}
              className="w-10 sm:w-12 h-10 sm:h-12 bg-white/10 rounded-xl flex-shrink-0"
            />
            <div className="flex-1 min-w-0 space-y-2">
              <motion.div 
                {...shimmer}
                className="h-5 sm:h-6 bg-white/10 rounded w-48"
              />
              <motion.div 
                {...shimmer}
                className="h-3 sm:h-4 bg-white/5 rounded w-32"
              />
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <motion.div 
              {...shimmer}
              className="h-10 bg-white/10 rounded-lg w-32"
            />
            <motion.div 
              {...shimmer}
              className="h-10 bg-white/10 rounded-lg w-28"
            />
          </div>
        </div>

        {/* Score display skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mb-6 lg:mb-8">
          {/* Main score circle */}
          <div className="lg:col-span-1">
            <div className="text-center">
              <motion.div 
                {...shimmer}
                className="w-24 sm:w-32 h-24 sm:h-32 bg-white/10 rounded-full mx-auto mb-4"
              />
              <motion.div 
                {...shimmer}
                className="h-5 bg-white/10 rounded w-24 mx-auto mb-2"
              />
            </div>
          </div>

          {/* Score breakdown */}
          <div className="lg:col-span-2">
            <motion.div 
              {...shimmer}
              className="h-5 bg-white/10 rounded w-32 mb-4"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="p-3 sm:p-4 bg-white/5 border border-white/10 rounded-lg">
                  <motion.div 
                    {...shimmer}
                    className="h-3 bg-white/10 rounded w-20 mb-2"
                  />
                  <motion.div 
                    {...shimmer}
                    className="h-5 bg-white/10 rounded w-16"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* History section skeleton */}
        <div className="border-t border-white/10 pt-6">
          <div className="flex items-center justify-between mb-4">
            <motion.div 
              {...shimmer}
              className="h-5 bg-white/10 rounded w-32"
            />
            <motion.div 
              {...shimmer}
              className="h-4 bg-white/5 rounded w-24"
            />
          </div>
          
          <motion.div 
            {...shimmer}
            className="h-3 bg-white/5 rounded w-40 mb-4"
          />

          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <motion.div 
                      {...shimmer}
                      className="w-6 h-3 bg-white/10 rounded"
                    />
                    <div>
                      <motion.div 
                        {...shimmer}
                        className="h-4 bg-white/10 rounded w-16 mb-1"
                      />
                      <motion.div 
                        {...shimmer}
                        className="h-3 bg-white/5 rounded w-24"
                      />
                    </div>
                  </div>
                  <motion.div 
                    {...shimmer}
                    className="h-3 bg-white/5 rounded w-20"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Skeleton for empty test state
 */
export const EmptyTestSkeleton = () => {
  const shimmer = {
    initial: { opacity: 0.6 },
    animate: { opacity: 1 },
    transition: {
      repeat: Infinity,
      repeatType: "reverse",
      duration: 1.2,
      ease: "easeInOut"
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-purple-500/20 overflow-hidden">
      <div className="p-4 sm:p-6 lg:p-8 text-center">
        <motion.div 
          {...shimmer}
          className="w-16 sm:w-20 h-16 sm:h-20 bg-white/10 rounded-full mx-auto mb-4 sm:mb-6"
        />
        
        <motion.div 
          {...shimmer}
          className="h-6 sm:h-7 bg-white/10 rounded w-48 mx-auto mb-3 sm:mb-4"
        />
        
        <div className="space-y-2 mb-6 sm:mb-8 max-w-md mx-auto">
          <motion.div 
            {...shimmer}
            className="h-4 bg-white/5 rounded w-full"
          />
          <motion.div 
            {...shimmer}
            className="h-4 bg-white/5 rounded w-3/4 mx-auto"
          />
          <motion.div 
            {...shimmer}
            className="h-4 bg-white/5 rounded w-5/6 mx-auto"
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center max-w-md mx-auto mb-6 sm:mb-8">
          <motion.div 
            {...shimmer}
            className="h-10 bg-white/10 rounded-lg flex-1"
          />
          <motion.div 
            {...shimmer}
            className="h-10 bg-white/10 rounded-lg flex-1"
          />
        </div>
        
        <motion.div 
          {...shimmer}
          className="h-20 bg-white/5 rounded-lg max-w-2xl mx-auto"
        />
      </div>
    </div>
  );
};

/**
 * Skeleton for comparison view
 */
export const ComparisonSkeleton = () => {
  const shimmer = {
    initial: { opacity: 0.6 },
    animate: { opacity: 1 },
    transition: {
      repeat: Infinity,
      repeatType: "reverse",
      duration: 1.2,
      ease: "easeInOut"
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-purple-500/20 overflow-hidden">
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-0 mb-6 lg:mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <motion.div 
              {...shimmer}
              className="w-10 sm:w-12 h-10 sm:h-12 bg-white/10 rounded-xl flex-shrink-0"
            />
            <div className="flex-1 min-w-0 space-y-2">
              <motion.div 
                {...shimmer}
                className="h-5 sm:h-6 bg-white/10 rounded w-56"
              />
              <motion.div 
                {...shimmer}
                className="h-3 sm:h-4 bg-white/5 rounded w-40"
              />
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <motion.div 
              {...shimmer}
              className="h-10 bg-white/10 rounded-lg w-32"
            />
            <motion.div 
              {...shimmer}
              className="h-10 bg-white/10 rounded-lg w-36"
            />
          </div>
        </div>

        {/* Comparison cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-6 lg:mb-8">
          {[1, 2].map((item) => (
            <div key={item} className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <motion.div 
                  {...shimmer}
                  className="w-10 h-10 bg-white/10 rounded-lg"
                />
                <div className="space-y-2">
                  <motion.div 
                    {...shimmer}
                    className="h-5 bg-white/10 rounded w-24"
                  />
                  <motion.div 
                    {...shimmer}
                    className="h-3 bg-white/5 rounded w-32"
                  />
                </div>
              </div>
              
              <div className="text-center mb-6">
                <motion.div 
                  {...shimmer}
                  className="h-10 bg-white/10 rounded w-20 mx-auto mb-2"
                />
                <motion.div 
                  {...shimmer}
                  className="h-4 bg-white/5 rounded w-24 mx-auto"
                />
              </div>
              
              <div className="space-y-3">
                {[1, 2, 3].map((detail) => (
                  <div key={detail} className="flex justify-between items-center">
                    <motion.div 
                      {...shimmer}
                      className="h-3 bg-white/5 rounded w-20"
                    />
                    <motion.div 
                      {...shimmer}
                      className="h-3 bg-white/10 rounded w-16"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Insights section */}
        <div className="space-y-6">
          <motion.div 
            {...shimmer}
            className="h-5 bg-white/10 rounded w-40"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="p-6 bg-white/5 border border-white/10 rounded-xl">
                <div className="flex items-start gap-3">
                  <motion.div 
                    {...shimmer}
                    className="w-6 h-6 bg-white/10 rounded"
                  />
                  <div className="flex-1 space-y-2">
                    <motion.div 
                      {...shimmer}
                      className="h-4 bg-white/10 rounded w-32"
                    />
                    <motion.div 
                      {...shimmer}
                      className="h-3 bg-white/5 rounded w-full"
                    />
                    <motion.div 
                      {...shimmer}
                      className="h-3 bg-white/5 rounded w-3/4"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestResultsSkeleton;