import React from 'react';

/**
 * Base skeleton component with customizable dimensions and animations
 */
const SkeletonLoader = ({ 
  width = 'w-full', 
  height = 'h-4', 
  className = '', 
  rounded = 'rounded',
  animate = true,
  variant = 'default'
}) => {
  const baseClasses = `${width} ${height} ${rounded} ${className}`;
  
  const variants = {
    default: 'bg-white/10',
    light: 'bg-white/5',
    dark: 'bg-gray-800/50',
    purple: 'bg-purple-500/10'
  };

  const animationClass = animate ? 'animate-pulse' : '';
  const variantClass = variants[variant] || variants.default;

  return (
    <div className={`${baseClasses} ${variantClass} ${animationClass}`} />
  );
};

/**
 * Text skeleton with multiple lines
 */
export const TextSkeleton = ({ 
  lines = 3, 
  className = '', 
  lastLineWidth = 'w-3/4',
  spacing = 'space-y-2'
}) => {
  return (
    <div className={`${spacing} ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonLoader
          key={index}
          width={index === lines - 1 ? lastLineWidth : 'w-full'}
          height="h-4"
        />
      ))}
    </div>
  );
};

/**
 * Card skeleton for dashboard cards
 */
export const CardSkeleton = ({ className = '' }) => {
  return (
    <div className={`bg-white/5 border border-white/10 rounded-xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <SkeletonLoader width="w-24" height="h-5" />
        <SkeletonLoader width="w-8" height="h-8" rounded="rounded-full" />
      </div>
      <SkeletonLoader width="w-16" height="h-8" className="mb-2" />
      <TextSkeleton lines={2} lastLineWidth="w-2/3" />
    </div>
  );
};

/**
 * Chat message skeleton
 */
export const ChatMessageSkeleton = ({ isUser = false, className = '' }) => {
  const alignmentClass = isUser ? 'justify-end' : 'justify-start';
  const avatarSide = isUser ? 'order-2' : 'order-1';
  const messageSide = isUser ? 'order-1' : 'order-2';
  
  return (
    <div className={`flex ${alignmentClass} gap-4 mb-6 ${className}`}>
      {/* Avatar */}
      <div className={`${avatarSide} flex-shrink-0`}>
        <SkeletonLoader 
          width="w-10" 
          height="h-10" 
          rounded="rounded-full" 
          variant={isUser ? 'purple' : 'default'}
        />
      </div>
      
      {/* Message */}
      <div className={`${messageSide} max-w-md`}>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <TextSkeleton 
            lines={Math.floor(Math.random() * 3) + 1} 
            lastLineWidth="w-3/4" 
          />
        </div>
        <div className="mt-2 pl-4">
          <SkeletonLoader width="w-16" height="h-3" />
        </div>
      </div>
    </div>
  );
};

/**
 * Chat history item skeleton
 */
export const ChatHistorySkeleton = ({ className = '' }) => {
  return (
    <div className={`p-3 border-b border-white/5 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <SkeletonLoader width="w-32" height="h-4" />
        <SkeletonLoader width="w-12" height="h-3" />
      </div>
      <SkeletonLoader width="w-full" height="h-3" />
    </div>
  );
};

/**
 * Template item skeleton
 */
export const TemplateSkeleton = ({ className = '' }) => {
  return (
    <div className={`bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <SkeletonLoader width="w-40" height="h-5" />
        <SkeletonLoader width="w-16" height="h-6" rounded="rounded-full" />
      </div>
      <TextSkeleton lines={2} lastLineWidth="w-5/6" spacing="space-y-1" />
    </div>
  );
};

/**
 * JIRA project skeleton
 */
export const JiraProjectSkeleton = ({ className = '' }) => {
  return (
    <div className={`flex items-center gap-3 p-3 border border-white/10 rounded-lg ${className}`}>
      <SkeletonLoader width="w-10" height="h-10" rounded="rounded" />
      <div className="flex-1">
        <SkeletonLoader width="w-32" height="h-4" className="mb-1" />
        <SkeletonLoader width="w-24" height="h-3" />
      </div>
      <SkeletonLoader width="w-6" height="h-6" rounded="rounded-full" />
    </div>
  );
};

/**
 * Statistics skeleton for dashboard
 */
export const StatsSkeleton = ({ className = '' }) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${className}`}>
      {Array.from({ length: 3 }).map((_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  );
};

/**
 * List skeleton with customizable items
 */
export const ListSkeleton = ({ 
  items = 5, 
  ItemComponent = ChatHistorySkeleton,
  className = '' 
}) => {
  return (
    <div className={className}>
      {Array.from({ length: items }).map((_, index) => (
        <ItemComponent key={index} />
      ))}
    </div>
  );
};

/**
 * Form skeleton
 */
export const FormSkeleton = ({ fields = 3, className = '' }) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index}>
          <SkeletonLoader width="w-24" height="h-4" className="mb-2" />
          <SkeletonLoader width="w-full" height="h-12" rounded="rounded-lg" />
        </div>
      ))}
      <div className="pt-4">
        <SkeletonLoader width="w-32" height="h-10" rounded="rounded-lg" />
      </div>
    </div>
  );
};

export default SkeletonLoader;