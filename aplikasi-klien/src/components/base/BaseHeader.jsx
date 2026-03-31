/**
 * Optimized Base Header Component
 * Reusable header with consistent styling and performance optimizations
 */

import { memo, useMemo } from 'react';
import { useComponentPerformance } from '../../utils/performance/componentProfiler';

const BaseHeader = memo(({
  title,
  subtitle,
  level = 1,
  className = '',
  titleClassName = '',
  subtitleClassName = '',
  actions,
  breadcrumbs,
  loading = false,
  skeleton = false,
  variant = 'default',
  size = 'md',
  alignment = 'left',
  ...props
}) => {
  const { measureOperation } = useComponentPerformance('BaseHeader');

  // Memoized style configurations
  const styles = useMemo(() => {
    const variants = {
      default: 'text-gray-900',
      primary: 'text-blue-900',
      secondary: 'text-gray-600',
      success: 'text-green-900',
      warning: 'text-yellow-900',
      error: 'text-red-900',
      dark: 'text-white'
    };

    const sizes = {
      xs: {
        title: 'text-lg font-semibold',
        subtitle: 'text-xs'
      },
      sm: {
        title: 'text-xl font-semibold',
        subtitle: 'text-sm'
      },
      md: {
        title: 'text-2xl font-bold',
        subtitle: 'text-base'
      },
      lg: {
        title: 'text-3xl font-bold',
        subtitle: 'text-lg'
      },
      xl: {
        title: 'text-4xl font-bold',
        subtitle: 'text-xl'
      }
    };

    const alignments = {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right'
    };

    return {
      variant: variants[variant] || variants.default,
      size: sizes[size] || sizes.md,
      alignment: alignments[alignment] || alignments.left
    };
  }, [variant, size, alignment]);

  // Get appropriate heading tag
  const HeadingTag = useMemo(() => {
    const validLevels = [1, 2, 3, 4, 5, 6];
    const headingLevel = validLevels.includes(level) ? level : 1;
    return `h${headingLevel}`;
  }, [level]);

  // Render breadcrumbs
  const renderBreadcrumbs = () => {
    if (!breadcrumbs || breadcrumbs.length === 0) return null;

    return (
      <nav className="flex mb-2" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-2">
          {breadcrumbs.map((crumb, index) => (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <svg
                  className="w-4 h-4 text-gray-400 mx-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {crumb.href ? (
                <a
                  href={crumb.href}
                  className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                  onClick={crumb.onClick}
                >
                  {crumb.label}
                </a>
              ) : (
                <span className="text-sm text-gray-500">{crumb.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    );
  };

  // Render skeleton loading state
  const renderSkeleton = () => (
    <div className={`animate-pulse ${styles.alignment} ${className}`}>
      {breadcrumbs && (
        <div className="flex items-center space-x-2 mb-2">
          <div className="h-4 bg-gray-200 rounded w-16"></div>
          <div className="h-4 bg-gray-200 rounded w-2"></div>
          <div className="h-4 bg-gray-200 rounded w-20"></div>
        </div>
      )}
      <div className="space-y-2">
        <div className={`h-8 bg-gray-200 rounded ${size === 'xs' ? 'w-32' : size === 'sm' ? 'w-40' : size === 'md' ? 'w-48' : size === 'lg' ? 'w-56' : 'w-64'}`}></div>
        {subtitle && (
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        )}
      </div>
      {actions && (
        <div className="flex space-x-2 mt-4">
          <div className="h-8 bg-gray-200 rounded w-20"></div>
          <div className="h-8 bg-gray-200 rounded w-16"></div>
        </div>
      )}
    </div>
  );

  // Show skeleton if loading or skeleton prop is true
  if (loading || skeleton) {
    return renderSkeleton();
  }

  return measureOperation('render', () => (
    <header className={`${styles.alignment} ${className}`} {...props}>
      {renderBreadcrumbs()}
      
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <HeadingTag
            className={`${styles.size.title} ${styles.variant} ${titleClassName} leading-tight`}
          >
            {title}
          </HeadingTag>
          
          {subtitle && (
            <p className={`${styles.size.subtitle} text-gray-600 mt-1 ${subtitleClassName}`}>
              {subtitle}
            </p>
          )}
        </div>
        
        {actions && (
          <div className="flex items-center space-x-3 ml-4 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </header>
  ));
});

BaseHeader.displayName = 'BaseHeader';

export default BaseHeader;