import React from 'react';
import { Button } from './button';
import { cn } from '../../lib/utils';

interface RainbowButtonProps extends Omit<React.ComponentProps<typeof Button>, 'size' | 'variant'> {
  variant?: 'rainbow' | 'aurora' | 'sunset' | 'ocean' | 'forest' | 'fire';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

const RainbowButton: React.FC<RainbowButtonProps> = ({
  children,
  variant = 'rainbow',
  size = 'md',
  animated = true,
  className,
  ...props
}) => {
  const variants = {
    rainbow: 'bg-gradient-to-r from-vibrant-pink-500 via-vibrant-purple-500 via-vibrant-blue-500 to-vibrant-emerald-500',
    aurora: 'bg-gradient-to-r from-vibrant-purple-500 via-vibrant-pink-500 to-vibrant-orange-500',
    sunset: 'bg-gradient-to-r from-vibrant-orange-500 via-vibrant-pink-500 to-vibrant-purple-500',
    ocean: 'bg-gradient-to-r from-vibrant-blue-500 via-vibrant-cyan-500 to-vibrant-emerald-500',
    forest: 'bg-gradient-to-r from-vibrant-emerald-500 via-vibrant-cyan-500 to-vibrant-blue-500',
    fire: 'bg-gradient-to-r from-vibrant-orange-500 via-vibrant-pink-500 to-vibrant-purple-500',
  };

  const sizeClasses = {
    sm: 'h-8 px-4 text-sm',
    md: 'h-10 px-6 text-base',
    lg: 'h-12 px-8 text-lg',
  };

  const animationClasses = animated ? 'animate-pulse hover:animate-none' : '';

  return (
    <Button
      className={cn(
        'text-white border-0 shadow-lg transition-all duration-300 transform hover:scale-105 hover:shadow-2xl',
        variants[variant],
        sizeClasses[size],
        animationClasses,
        'relative overflow-hidden',
        'before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700',
        className
      )}
      {...props}
    >
      <span className="relative z-10">{children}</span>
    </Button>
  );
};

export default RainbowButton;
