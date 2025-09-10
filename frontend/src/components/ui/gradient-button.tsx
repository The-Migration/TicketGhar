import React from 'react';
import { Button } from './button';
import { cn } from '../../lib/utils';

interface GradientButtonProps extends Omit<React.ComponentProps<typeof Button>, 'size'> {
  gradient?: 'purple-blue' | 'blue-purple' | 'green-blue' | 'pink-purple';
  size?: 'sm' | 'md' | 'lg';
}

const GradientButton: React.FC<GradientButtonProps> = ({
  children,
  gradient = 'purple-blue',
  size = 'md',
  className,
  ...props
}) => {
  const gradientClasses = {
    'purple-blue': 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700',
    'blue-purple': 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700',
    'green-blue': 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700',
    'pink-purple': 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700'
  };

  const sizeClasses = {
    sm: 'h-8 px-4 text-sm',
    md: 'h-10 px-6 text-base',
    lg: 'h-12 px-8 text-lg'
  };

  return (
    <Button
      className={cn(
        'text-white border-0 shadow-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl',
        gradientClasses[gradient],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
};

export default GradientButton;
