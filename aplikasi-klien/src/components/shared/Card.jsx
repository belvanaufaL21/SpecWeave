/**
 * Reusable Card Component
 * Consistent card design with multiple variants
 */

import React from 'react';
import { theme } from '../../styles/shared/theme.js';

const Card = ({
  children,
  variant = 'default',
  padding = 'md',
  shadow = 'md',
  border = true,
  hover = false,
  className = '',
  onClick,
  ...props
}) => {
  // Padding variants
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10'
  };

  // Shadow variants
  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl'
  };

  // Variant styles
  const variantClasses = {
    default: 'bg-[#0a0a0f]/95 backdrop-blur-xl',
    elevated: 'bg-[#0a0a0f]/98 backdrop-blur-xl',
    outlined: 'bg-transparent border-2',
    filled: 'bg-white dark:bg-gray-800',
    glass: 'bg-white/10 backdrop-blur-xl border border-white/20'
  };

  // Border classes
  const borderClasses = border ? 'border border-white/10' : '';

  // Hover effects
  const hoverClasses = hover ? 'transition-all duration-200 hover:shadow-lg hover:scale-[1.02]' : '';

  // Interactive classes
  const interactiveClasses = onClick ? 'cursor-pointer' : '';

  const cardClasses = `
    ${variantClasses[variant]}
    ${paddingClasses[padding]}
    ${shadowClasses[shadow]}
    ${borderClasses}
    ${hoverClasses}
    ${interactiveClasses}
    rounded-2xl
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <div
      className={cardClasses}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
};

// Card Header component
export const CardHeader = ({ 
  children, 
  className = '',
  divider = true,
  ...props 
}) => {
  const dividerClasses = divider ? 'border-b border-white/10 pb-4 mb-6' : '';
  
  return (
    <div 
      className={`${dividerClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

// Card Title component
export const CardTitle = ({ 
  children, 
  level = 2,
  className = '',
  ...props 
}) => {
  const Tag = `h${level}`;
  const sizeClasses = {
    1: 'text-3xl font-bold',
    2: 'text-2xl font-bold',
    3: 'text-xl font-semibold',
    4: 'text-lg font-semibold',
    5: 'text-base font-medium',
    6: 'text-sm font-medium'
  };

  return (
    <Tag 
      className={`text-white ${sizeClasses[level]} ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
};

// Card Content component
export const CardContent = ({ 
  children, 
  className = '',
  ...props 
}) => {
  return (
    <div 
      className={`text-gray-300 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

// Card Footer component
export const CardFooter = ({ 
  children, 
  className = '',
  divider = true,
  justify = 'end',
  ...props 
}) => {
  const dividerClasses = divider ? 'border-t border-white/10 pt-4 mt-6' : '';
  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around'
  };

  return (
    <div 
      className={`flex ${justifyClasses[justify]} ${dividerClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

// Card Actions component
export const CardActions = ({ 
  children, 
  className = '',
  spacing = 'md',
  ...props 
}) => {
  const spacingClasses = {
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4'
  };

  return (
    <div 
      className={`flex items-center ${spacingClasses[spacing]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

// Card Image component
export const CardImage = ({ 
  src, 
  alt, 
  className = '',
  aspectRatio = 'auto',
  objectFit = 'cover',
  ...props 
}) => {
  const aspectRatioClasses = {
    auto: '',
    square: 'aspect-square',
    video: 'aspect-video',
    '4/3': 'aspect-[4/3]',
    '3/2': 'aspect-[3/2]',
    '16/9': 'aspect-[16/9]'
  };

  const objectFitClasses = {
    contain: 'object-contain',
    cover: 'object-cover',
    fill: 'object-fill',
    none: 'object-none',
    'scale-down': 'object-scale-down'
  };

  return (
    <div className={`overflow-hidden rounded-t-2xl ${aspectRatioClasses[aspectRatio]}`}>
      <img
        src={src}
        alt={alt}
        className={`w-full h-full ${objectFitClasses[objectFit]} ${className}`}
        {...props}
      />
    </div>
  );
};

// Compound component exports
Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Content = CardContent;
Card.Footer = CardFooter;
Card.Actions = CardActions;
Card.Image = CardImage;

export default Card;